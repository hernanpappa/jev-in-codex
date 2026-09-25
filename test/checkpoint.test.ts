import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpoint, MAX_CHECKPOINT_CANDIDATES, MAX_CHECKPOINT_EXCERPT_CHARS,
  MAX_CHECKPOINT_INPUT_CHARS, MAX_CHECKPOINT_MESSAGES, MAX_CHECKPOINT_OUTPUT_CHARS,
  MAX_CHECKPOINT_RESULTS, MAX_CHECKPOINT_TRANSCRIPT_BYTES, checkpointMessagesSchema } from '../src/checkpoint.js';
import { Jev } from '../src/jev.js';

test('checkpoint limits accept the documented maximum and reject oversized input', () => {
  assert.equal(checkpointMessagesSchema.safeParse([{ role: 'user', text: 'x'.repeat(MAX_CHECKPOINT_INPUT_CHARS) }]).success, true);
  assert.equal(checkpointMessagesSchema.safeParse([{ role: 'user', text: 'x'.repeat(MAX_CHECKPOINT_INPUT_CHARS + 1) }]).success, false);
  assert.equal(checkpointMessagesSchema.safeParse(Array.from({ length: MAX_CHECKPOINT_MESSAGES + 1 }, () => ({ role: 'user', text: 'x' }))).success, false);
  assert.equal(MAX_CHECKPOINT_CANDIDATES, 24);
  assert.equal(MAX_CHECKPOINT_EXCERPT_CHARS * MAX_CHECKPOINT_RESULTS, MAX_CHECKPOINT_OUTPUT_CHARS);
  assert.equal(MAX_CHECKPOINT_TRANSCRIPT_BYTES, 1024 * 1024);
});

test('local-only selection preserves original text and offsets, even when a TypeSafe key is present', async () => {
  const text = 'La decisión vigente es conservar checkpoints privados para rollback.';
  const result = await createCheckpoint({
    objective: 'decisión checkpoints privados',
    messages: [{ id: 'turn-7', role: 'assistant', text }],
    limit: 8,
    jev: new Jev({ apiKey: 'synthetic-key', fetch: async () => { throw new Error('Must not make a network request.'); } }),
    allowRemote: false,
  });
  assert.equal(result.method, 'local_fallback');
  assert.equal(result.api_requests, 0);
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.results[0], {
    message_index: 0, message_id: 'turn-7', role: 'assistant', start_offset: 0, end_offset: text.length,
    text, score: 1,
  });
  assert.equal(result.coverage.source_complete, true);
});

test('no relevant evidence produces no invented passage', async () => {
  const result = await createCheckpoint({ objective: 'network outage', messages: [
    { role: 'user', text: 'Necesito cambiar el color del botón.' },
  ], limit: 8, jev: new Jev(), allowRemote: false });
  assert.deepEqual(result.results, []);
  assert.equal(result.omitted_results, 0);
});

test('large histories are locally shortlisted and disclose omitted coverage', async () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({ role: 'user' as const,
    text: index === 29 ? `database critical decision ${'x'.repeat(1200)}` : `unrelated note ${'x'.repeat(1200)}` }));
  const result = await createCheckpoint({ objective: 'database critical decision', messages, limit: 2, jev: new Jev(), allowRemote: false });
  assert.equal(result.coverage.preselection, 'lexical');
  assert.ok(result.coverage.passages_not_evaluated > 0);
  assert.ok(result.results[0].text.includes('database critical decision'));
});

test('remote Noul ranking only runs after an explicit checkpoint opt-in', async () => {
  let requests = 0;
  const jev = new Jev({ apiKey: 'synthetic-key', fetch: async (_url, init) => {
    requests++;
    const body = JSON.parse(init!.body as string);
    assert.ok(body.state.candidates.every((candidate: { text: string }) => candidate.text.length <= MAX_CHECKPOINT_EXCERPT_CHARS));
    return Response.json({ model: 'jev-test', answers: Object.fromEntries(Object.keys(body.questions).map(id => [id, { type: 'noul', noul: 0.91 }])) });
  } });
  const input = { objective: 'preserve database decision', messages: [{ role: 'user' as const, text: 'Preserve database decision for rollback.' }], limit: 8, jev };
  assert.equal((await createCheckpoint({ ...input, allowRemote: false })).method, 'local_fallback');
  assert.equal(requests, 0);
  const result = await createCheckpoint({ ...input, allowRemote: true });
  assert.equal(result.method, 'jev');
  assert.equal(requests, 1);
  assert.equal(result.results[0].score, 0.91);
});
