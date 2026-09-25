import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readdir, realpath, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { CHECKPOINT_TTL_MS, MAX_CHECKPOINT_EXCERPT_CHARS, MAX_CHECKPOINT_RESULTS } from './checkpoint.js';

export const MAX_STORED_CHECKPOINT_BYTES = 64 * 1024;
const directoryName = 'jev-context-checkpoints';
const storedSchema = z.object({
  session_id: z.string().min(1).max(256),
  project_path: z.string().min(1).max(4096),
  created_at: z.number().finite(),
  expires_at: z.number().finite(),
  objective: z.string().min(1).max(2000),
  method: z.enum(['jev', 'local_fallback']),
  score_kind: z.enum(['noul', 'lexical_overlap']),
  model: z.string().max(200).optional(),
  results: z.array(z.object({
    message_index: z.number().int().min(0),
    message_id: z.string().max(200).optional(),
    role: z.enum(['user', 'assistant']),
    start_offset: z.number().int().min(0),
    end_offset: z.number().int().min(1),
    text: z.string().min(1).max(MAX_CHECKPOINT_EXCERPT_CHARS),
    score: z.number().min(0).max(1),
  })).min(1).max(MAX_CHECKPOINT_RESULTS),
  coverage: z.object({
    messages_received: z.number().int().min(0),
    passages_generated: z.number().int().min(0),
    passages_evaluated: z.number().int().min(0),
    passages_not_evaluated: z.number().int().min(0),
    preselection: z.enum(['all', 'lexical']),
    output_chars: z.number().int().min(0),
    output_limit_chars: z.number().int().positive(),
    source_complete: z.boolean(),
    transcript_bytes_read: z.number().int().min(0).optional(),
    transcript_head_truncated: z.boolean().optional(),
    records_seen: z.number().int().min(0).optional(),
    records_omitted: z.number().int().min(0).optional(),
  }),
});

export type StoredCheckpoint = z.infer<typeof storedSchema>;

async function checkpointDirectory(pluginData: string): Promise<string> {
  if (!path.isAbsolute(pluginData)) throw new Error('Plugin data directory is unavailable.');
  const rootStat = await lstat(pluginData);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Plugin data directory is invalid.');
  const root = await realpath(pluginData);
  const directory = path.join(root, directoryName);
  try { await mkdir(directory, { mode: 0o700 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Checkpoint directory is invalid.');
  await chmod(directory, 0o700);
  return directory;
}

async function projectIdentity(projectPath: string): Promise<string> {
  const canonical = await realpath(projectPath);
  if (!(await lstat(canonical)).isDirectory()) throw new Error('Project directory is invalid.');
  return canonical;
}

function storageKey(sessionId: string, projectPath: string): string {
  return createHash('sha256').update(sessionId).update('\0').update(projectPath).digest('hex');
}

async function removeIfRegular(filePath: string): Promise<void> {
  try {
    const info = await lstat(filePath);
    if (info.isFile() && !info.isSymbolicLink()) await unlink(filePath);
  } catch { /* Missing or inaccessible stale files are ignored. */ }
}

async function cleanupExpired(directory: string, now: number): Promise<void> {
  let entries: string[];
  try { entries = await readdir(directory); } catch { return; }
  for (const entry of entries) {
    if (/^\.tmp-[0-9a-f-]{36}$/u.test(entry)) {
      const tempPath = path.join(directory, entry);
      try {
        const info = await lstat(tempPath);
        if (info.isFile() && !info.isSymbolicLink() && info.mtimeMs < now - 10 * 60 * 1000) await unlink(tempPath);
      } catch { /* A later hook may retry cleanup. */ }
      continue;
    }
    if (!/^[a-f0-9]{64}\.json$/u.test(entry)) continue;
    const filePath = path.join(directory, entry);
    try {
      const info = await lstat(filePath);
      if (info.isSymbolicLink() || !info.isFile() || info.size > MAX_STORED_CHECKPOINT_BYTES) continue;
      const contents = await readCheckpointFile(filePath);
      if (!contents || contents.expires_at <= now) await removeIfRegular(filePath);
    } catch { /* A later hook may retry cleanup. */ }
  }
}

async function readCheckpointFile(filePath: string): Promise<StoredCheckpoint | undefined> {
  let handle;
  try { handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch { return undefined; }
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_STORED_CHECKPOINT_BYTES) return undefined;
    const bytes = Buffer.alloc(info.size + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > MAX_STORED_CHECKPOINT_BYTES) return undefined;
    const parsed = storedSchema.safeParse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, bytesRead))));
    return parsed.success ? parsed.data : undefined;
  } catch { return undefined; }
  finally { await handle.close(); }
}

export async function saveCheckpoint(pluginData: string, checkpoint: StoredCheckpoint): Promise<void> {
  const directory = await checkpointDirectory(pluginData);
  const project = await projectIdentity(checkpoint.project_path);
  const normalized = storedSchema.parse({ ...checkpoint, project_path: project });
  const data = Buffer.from(JSON.stringify(normalized), 'utf8');
  if (data.length > MAX_STORED_CHECKPOINT_BYTES) throw new Error('Checkpoint storage limit exceeded.');
  await cleanupExpired(directory, Date.now());
  const target = path.join(directory, `${storageKey(normalized.session_id, project)}.json`);
  const temp = path.join(directory, `.tmp-${randomUUID()}`);
  const handle = await open(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  let writeError: unknown;
  try { await handle.writeFile(data); await handle.sync(); }
  catch (error) { writeError = error; }
  try { await handle.close(); } catch (error) { writeError ??= error; }
  if (writeError !== undefined) { await removeIfRegular(temp); throw writeError; }
  try { await rename(temp, target); }
  catch (error) { await removeIfRegular(temp); throw error; }
}

export async function loadCheckpoint(pluginData: string, sessionId: string, projectPath: string, now = Date.now()): Promise<{
  checkpoint?: StoredCheckpoint;
  filePath?: string;
}> {
  const directory = await checkpointDirectory(pluginData);
  const project = await projectIdentity(projectPath);
  await cleanupExpired(directory, now);
  const filePath = path.join(directory, `${storageKey(sessionId, project)}.json`);
  const checkpoint = await readCheckpointFile(filePath);
  if (!checkpoint || checkpoint.session_id !== sessionId || checkpoint.project_path !== project || checkpoint.expires_at <= now) {
    await removeIfRegular(filePath);
    return {};
  }
  return { checkpoint, filePath };
}

export async function consumeCheckpoint(filePath: string): Promise<void> {
  await removeIfRegular(filePath);
}

export function newStoredCheckpoint(input: {
  sessionId: string;
  projectPath: string;
  objective: string;
  selection: {
    method: 'jev' | 'local_fallback';
    score_kind: 'noul' | 'lexical_overlap';
    model?: string;
    results: StoredCheckpoint['results'];
    coverage: StoredCheckpoint['coverage'];
  };
  now?: number;
}): StoredCheckpoint {
  const created = input.now ?? Date.now();
  return storedSchema.parse({ session_id: input.sessionId, project_path: input.projectPath,
    created_at: created, expires_at: created + CHECKPOINT_TTL_MS, objective: input.objective,
    method: input.selection.method, score_kind: input.selection.score_kind, model: input.selection.model,
    results: input.selection.results, coverage: input.selection.coverage });
}
