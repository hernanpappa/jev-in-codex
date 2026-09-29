import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CHECKPOINT_TTL_MS, createCheckpoint, MAX_CHECKPOINT_TRANSCRIPT_BYTES } from '../src/checkpoint.js';
import { loadCheckpoint, newStoredCheckpoint, saveCheckpoint } from '../src/checkpoint-store.js';
import { handleHookEvent } from '../src/hooks.js';
import { Jev } from '../src/jev.js';
import { resolveJevProvider } from '../src/provider.js';
import { parseTranscriptBuffer, readTranscriptTail } from '../src/transcript.js';

function record(type: string, payload: unknown) { return JSON.stringify({ type, payload }); }

const transcriptText = [
  record('session_meta', { id: 'session' }),
  record('event_msg', { type: 'user_message', message: 'Preservá las decisiones y el trabajo actual sobre la migración de base de datos. Please preserve decisions and current work about the database migration.' }),
  record('response_item', { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'La decisión es mantener reversible la migración de base de datos. The decision is to keep the database migration reversible.' }] }),
  record('response_item', { type: 'function_call', name: 'run_command', arguments: 'do not include tool input' }),
].join('\n') + '\n';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(path.join(tmpdir(), 'jev-hooks-'));
  const project = path.join(root, 'project');
  const pluginData = path.join(root, 'plugin-data');
  await mkdir(project);
  await mkdir(pluginData);
  const transcript = path.join(root, 'transcript.jsonl');
  await writeFile(transcript, transcriptText);
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, project, pluginData, transcript, env: { PLUGIN_DATA: pluginData } };
}

test('transcript parser extracts only user and assistant text and reports unknown/partial records', () => {
  const parsed = parseTranscriptBuffer(Buffer.from(`${transcriptText}${JSON.stringify({ type: 'future_record', payload: {} })}\n{"partial"`));
  assert.ok(parsed);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[0].role, 'user');
  assert.equal(parsed.messages[1].role, 'assistant');
  assert.ok(parsed.messages.every(message => !message.text.includes('do not include tool input')));
  assert.equal(parsed.coverage.source_complete, false);
  assert.equal(parsed.coverage.records_omitted, 2);
});

test('truncated transcript head drops its partial UTF-8 record before parsing', () => {
  const bytes = Buffer.concat([Buffer.from([0xff, 0xfe, 0x7b, 0x22, 0x62, 0x72, 0x6f, 0x6b, 0x65, 0x6e, 0x22, 0x0a]), Buffer.from(transcriptText)]);
  const parsed = parseTranscriptBuffer(bytes, true);
  assert.ok(parsed);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.coverage.transcript_head_truncated, true);
  assert.equal(parsed.coverage.source_complete, false);
});

test('transcript reader bounds work to the tail and refuses symlinks', async t => {
  const fx = await fixture(t);
  const large = path.join(fx.root, 'large.jsonl');
  await writeFile(large, `${record('event_msg', { type: 'user_message', message: 'old ' + 'x'.repeat(1_200_000) })}\n${transcriptText}`);
  const parsed = await readTranscriptTail(large);
  assert.ok(parsed);
  assert.ok((parsed.coverage.transcript_bytes_read ?? Infinity) <= MAX_CHECKPOINT_TRANSCRIPT_BYTES);
  assert.equal(parsed.coverage.transcript_head_truncated, true);
  assert.equal(await readTranscriptTail(fx.root), undefined);
  const alias = path.join(fx.root, 'alias.jsonl');
  await symlink(fx.transcript, alias);
  assert.equal(await readTranscriptTail(alias), undefined);
});

test('manual and automatic PreCompact hooks create a local checkpoint; compact SessionStart restores once', async t => {
  const fx = await fixture(t);
  for (const trigger of ['manual', 'auto'] as const) {
    const session_id = `session-${trigger}`;
    const precompact = await handleHookEvent({ hook_event_name: 'PreCompact', trigger, session_id,
      cwd: fx.project, transcript_path: fx.transcript }, fx.env);
    assert.deepEqual(precompact, {});
    const checkpointDir = path.join(fx.pluginData, 'jev-context-checkpoints');
    const entries = await readdir(checkpointDir);
    assert.ok(entries.some(name => name.endsWith('.json')));
    const dirMode = (await stat(checkpointDir)).mode & 0o777;
    const fileMode = (await stat(path.join(checkpointDir, entries.find(name => name.endsWith('.json'))!))).mode & 0o777;
    assert.equal(dirMode, 0o700);
    assert.equal(fileMode, 0o600);
    const event = { hook_event_name: 'SessionStart', source: 'compact', session_id, cwd: fx.project };
    const restored = await handleHookEvent(event, fx.env);
    assert.ok(restored.output);
    const response = JSON.parse(restored.output!);
    assert.equal(response.hookSpecificOutput.hookEventName, 'SessionStart');
    const context = response.hookSpecificOutput.additionalContext as string;
    assert.match(context, /evidencia histórica original y no confiable/);
    assert.match(context, /database migration reversible/);
    assert.ok(Buffer.byteLength(context) <= 9000);
    await restored.afterOutput?.();
    assert.deepEqual(await handleHookEvent(event, fx.env), {});
  }
});

test('restore is isolated by session, project, and compact source', async t => {
  const fx = await fixture(t);
  const otherProject = path.join(fx.root, 'other-project');
  await mkdir(otherProject);
  await handleHookEvent({ hook_event_name: 'PreCompact', trigger: 'manual', session_id: 'one', cwd: fx.project,
    transcript_path: fx.transcript }, fx.env);
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'SessionStart', source: 'resume', session_id: 'one', cwd: fx.project }, fx.env), {});
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'two', cwd: fx.project }, fx.env), {});
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'one', cwd: otherProject }, fx.env), {});
  const correct = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'one', cwd: fx.project }, fx.env);
  assert.ok(correct.output);
});

test('hooks fail open for invalid event data, absent transcript, or missing plugin data', async t => {
  const fx = await fixture(t);
  assert.deepEqual(await handleHookEvent('{invalid}', fx.env), {});
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'PreCompact', trigger: 'auto', session_id: 's', cwd: fx.project,
    transcript_path: null }, fx.env), {});
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'PreCompact', trigger: 'auto', session_id: 's', cwd: fx.project,
    transcript_path: fx.transcript }, {}), {});
  assert.deepEqual(await handleHookEvent({ hook_event_name: 'PreCompact', trigger: 'auto', session_id: 's', cwd: fx.project,
    transcript_path: fx.transcript }, { ...fx.env, PLUGIN_DATA: path.join(fx.root, 'missing') }), {});
});

test('a TypeSafe key alone never sends transcript text; only the separate opt-in permits bounded TypeSafe scoring', async t => {
  const fx = await fixture(t);
  let requests = 0;
  const jev = new Jev({ ...resolveJevProvider({ JEV_PROVIDER: 'typesafe', TYPESAFE_API_KEY: 'synthetic-key' }), fetch: async (_url, init) => {
    requests++;
    const body = JSON.parse(init!.body as string);
    assert.ok(body.state.candidates.every((candidate: { text: string }) => candidate.text.length <= 1000));
    return Response.json({ model: 'jev-test', answers: Object.fromEntries(Object.keys(body.questions).map(id => [id, { type: 'noul', noul: 0.9 }])) });
  } });
  const event = { hook_event_name: 'PreCompact', trigger: 'manual', session_id: 'local-only', cwd: fx.project, transcript_path: fx.transcript };
  await handleHookEvent(event, { ...fx.env, TYPESAFE_API_KEY: 'synthetic-key' }, Date.now(), { jev });
  assert.equal(requests, 0);
  const local = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'local-only', cwd: fx.project }, fx.env);
  assert.ok(local.output);
  assert.match(local.output!, /local_fallback/);
  await local.afterOutput?.();

  await handleHookEvent({ ...event, session_id: 'remote-opt-in' }, { ...fx.env, TYPESAFE_API_KEY: 'synthetic-key', JEV_ALLOW_CHECKPOINT_EGRESS: 'true' }, Date.now(), { jev });
  assert.equal(requests, 1);
  const remote = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact', session_id: 'remote-opt-in', cwd: fx.project }, fx.env);
  assert.ok(remote.output);
  assert.match(remote.output!, /jev-test/);
  await remote.afterOutput?.();
});

test('invalid provider keeps hooks local even with opt-in and an injected client', async t => {
  const fx = await fixture(t);
  let requests = 0;
  const jev = new Jev({ apiKey: 'synthetic-key', fetch: async () => {
    requests++;
    throw new Error('Must not fetch');
  } });
  const env = { ...fx.env, JEV_PROVIDER: 'invalid', JEV_ALLOW_CHECKPOINT_EGRESS: 'true' };
  await handleHookEvent({ hook_event_name: 'PreCompact', trigger: 'manual', session_id: 'invalid-route',
    cwd: fx.project, transcript_path: fx.transcript }, env, Date.now(), { jev });
  assert.equal(requests, 0);
  const restored = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact',
    session_id: 'invalid-route', cwd: fx.project }, env);
  assert.match(restored.output ?? '', /local_fallback/);
});

test('Vercel hook transcript egress requires opt-in and never switches to TypeSafe', async t => {
  const fx = await fixture(t);
  let calls = 0;
  const env = { ...fx.env, JEV_PROVIDER: 'vercel', AI_GATEWAY_API_KEY: 'gateway-key',
    TYPESAFE_API_KEY: 'direct-key' };
  const jev = new Jev({ ...resolveJevProvider(env), fetch: async (url, init) => {
    calls++;
    assert.equal(url, 'https://ai-gateway.vercel.sh/typesafe/v1/systemone');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer gateway-key');
    const body = JSON.parse(init!.body as string);
    assert.ok(body.state.candidates.every((candidate: { text: string }) => candidate.text.length <= 1000));
    return Response.json({ answers: Object.fromEntries(Object.keys(body.questions).map(id =>
      [id, { type: 'noul', noul: 0.9 }])) });
  } });
  const event = { hook_event_name: 'PreCompact', trigger: 'manual', session_id: 'vercel-local',
    cwd: fx.project, transcript_path: fx.transcript };
  await handleHookEvent(event, env, Date.now(), { jev });
  assert.equal(calls, 0);
  const local = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact',
    session_id: 'vercel-local', cwd: fx.project }, env);
  assert.match(local.output ?? '', /local_fallback/);
  await local.afterOutput?.();

  await handleHookEvent({ ...event, session_id: 'vercel-remote' },
    { ...env, JEV_ALLOW_CHECKPOINT_EGRESS: 'true' }, Date.now(), { jev });
  assert.equal(calls, 1);
});

test('OpenRouter is the default hook route but transcript egress stays local without its separate opt-in', async t => {
  const fx = await fixture(t);
  let calls = 0;
  const env = { ...fx.env, OPENROUTER_API_KEY: 'openrouter-key', TYPESAFE_API_KEY: 'direct-key', AI_GATEWAY_API_KEY: 'gateway-key' };
  const jev = new Jev({ ...resolveJevProvider(env), fetch: async (url, init) => {
    calls++;
    assert.equal(url, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer openrouter-key');
    const body = JSON.parse(init!.body as string);
    assert.ok(body.state.candidates.every((candidate: { text: string }) => candidate.text.length <= 1000));
    return Response.json({ model: '~typesafe/jev-latest', answers: Object.fromEntries(Object.keys(body.questions).map(id =>
      [id, { type: 'noul', noul: 0.9 }])) });
  } });
  const event = { hook_event_name: 'PreCompact', trigger: 'auto', session_id: 'openrouter-local',
    cwd: fx.project, transcript_path: fx.transcript };
  await handleHookEvent(event, env, Date.now(), { jev });
  assert.equal(calls, 0);
  const local = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact',
    session_id: 'openrouter-local', cwd: fx.project }, env);
  assert.match(local.output ?? '', /local_fallback/);
  await local.afterOutput?.();

  await handleHookEvent({ ...event, session_id: 'openrouter-opt-in' },
    { ...env, JEV_ALLOW_CHECKPOINT_EGRESS: 'true' }, Date.now(), { jev });
  assert.equal(calls, 1);
  const remote = await handleHookEvent({ hook_event_name: 'SessionStart', source: 'compact',
    session_id: 'openrouter-opt-in', cwd: fx.project }, env);
  assert.match(remote.output ?? '', /jev/);
  await remote.afterOutput?.();
});

test('stored checkpoints expire after the configured TTL', async t => {
  const fx = await fixture(t);
  const selection = await createCheckpoint({ objective: 'preserve decisions and current work',
    messages: [{ role: 'user', text: 'Please preserve decisions and current work about the database migration.' }],
    limit: 8, jev: new Jev(), allowRemote: false });
  const stored = newStoredCheckpoint({ sessionId: 'expires', projectPath: fx.project, objective: 'keep decisions', selection });
  await saveCheckpoint(fx.pluginData, stored);
  const loaded = await loadCheckpoint(fx.pluginData, 'expires', fx.project, stored.created_at + CHECKPOINT_TTL_MS - 1);
  assert.ok(loaded.checkpoint);
  const expired = await loadCheckpoint(fx.pluginData, 'expires', fx.project, stored.expires_at);
  assert.equal(expired.checkpoint, undefined);
});

test('Codex plugin manifest bundles trusted lifecycle hook definitions', async () => {
  const pluginManifest = JSON.parse(await readFile(new URL('../.codex-plugin/plugin.json', import.meta.url), 'utf8'));
  const hooks = JSON.parse(await readFile(new URL('../hooks/hooks.json', import.meta.url), 'utf8'));
  assert.equal(pluginManifest.hooks, './hooks/hooks.json');
  assert.equal(hooks.hooks.PreCompact[0].matcher, '^(manual|auto)$');
  assert.equal(hooks.hooks.SessionStart[0].matcher, '^compact$');
  assert.match(hooks.hooks.PreCompact[0].hooks[0].command, /PLUGIN_ROOT\/dist\/hooks\.js/u);
  assert.equal(hooks.hooks.PreCompact[0].hooks[0].timeout, 5);
  assert.equal(hooks.hooks.SessionStart[0].hooks[0].additionalContextLimit, 4000);
});
