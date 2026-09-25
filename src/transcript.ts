import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { MAX_CHECKPOINT_INPUT_CHARS, MAX_CHECKPOINT_MESSAGES, MAX_CHECKPOINT_TRANSCRIPT_BYTES,
  type CheckpointCoverage, type CheckpointMessage } from './checkpoint.js';

export const MAX_TRANSCRIPT_RECORD_BYTES = 64 * 1024;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function textFromContent(value: unknown, role: CheckpointMessage['role']): string | undefined {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return undefined;
  const allowed = role === 'user' ? new Set(['input_text', 'text']) : new Set(['output_text', 'text']);
  const text = value.flatMap(item => {
    if (!isObject(item) || typeof item.text !== 'string') return [];
    return typeof item.type === 'string' && allowed.has(item.type) ? [item.text] : [];
  }).join('\n');
  return text || undefined;
}

function messageFromRecord(record: unknown, recordIndex: number): CheckpointMessage | undefined {
  if (!isObject(record)) return undefined;
  const payload = isObject(record.payload) ? record.payload : record;
  const type = typeof payload.type === 'string' ? payload.type : record.type;
  let role: CheckpointMessage['role'] | undefined;
  let text: string | undefined;
  if (type === 'user_message') {
    role = 'user';
    text = typeof payload.message === 'string' ? payload.message : undefined;
  } else if (type === 'message' && (payload.role === 'user' || payload.role === 'assistant')) {
    role = payload.role;
    text = textFromContent(payload.content, role);
  }
  if (!role || !text?.trim()) return undefined;
  const id = typeof payload.id === 'string' ? payload.id : typeof record.id === 'string' ? record.id : `record-${recordIndex + 1}`;
  return { id: id.slice(0, 200), role, text };
}

function isKnownNonMessageRecord(record: unknown): boolean {
  if (!isObject(record)) return false;
  if (new Set(['session_meta', 'turn_context', 'compaction', 'token_count', 'custom_title', 'queue_operation']).has(String(record.type))) return true;
  if (record.type !== 'response_item' || !isObject(record.payload)) return false;
  return new Set(['function_call', 'function_call_output', 'reasoning', 'local_shell_call', 'local_shell_call_output',
    'computer_call', 'web_search_call', 'custom_tool_call', 'mcp_tool_call']).has(String(record.payload.type));
}

export function parseTranscriptBuffer(buffer: Buffer, headTruncated = false): {
  messages: CheckpointMessage[];
  coverage: CheckpointCoverage & { source_complete: boolean };
} | undefined {
  let completeBytes = buffer;
  if (headTruncated) {
    const firstNewline = buffer.indexOf(0x0a);
    if (firstNewline < 0) return { messages: [], coverage: { transcript_bytes_read: buffer.length,
      transcript_head_truncated: true, records_seen: 0, records_omitted: 0, source_complete: false } };
    completeBytes = buffer.subarray(firstNewline + 1);
  }
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(completeBytes); }
  catch { return undefined; }
  let lines = text.split('\n');
  const partialTail = !text.endsWith('\n');
  if (partialTail) lines.pop(); // The last record may still be in flight; don't infer it.
  let recordsSeen = 0;
  let recordsOmitted = 0;
  const extracted: CheckpointMessage[] = [];
  for (const line of lines) {
    if (!line) continue;
    const bytes = Buffer.byteLength(line);
    if (bytes > MAX_TRANSCRIPT_RECORD_BYTES) { recordsOmitted++; continue; }
    let record: unknown;
    try { record = JSON.parse(line); }
    catch { recordsOmitted++; continue; }
    const message = messageFromRecord(record, recordsSeen);
    recordsSeen++;
    if (message) extracted.push(message);
    else if (!isKnownNonMessageRecord(record)) recordsOmitted++;
  }

  const messages: CheckpointMessage[] = [];
  let chars = 0;
  let messagesOmitted = 0;
  for (const message of extracted.reverse()) {
    if (messages.length >= MAX_CHECKPOINT_MESSAGES || chars + message.text.length > MAX_CHECKPOINT_INPUT_CHARS) {
      messagesOmitted++;
      continue;
    }
    messages.push(message);
    chars += message.text.length;
  }
  messages.reverse();
  return { messages, coverage: { transcript_bytes_read: buffer.length, transcript_head_truncated: headTruncated,
    records_seen: recordsSeen, records_omitted: recordsOmitted + messagesOmitted + Number(partialTail),
    source_complete: !headTruncated && !partialTail && recordsOmitted === 0 && messagesOmitted === 0 } };
}

export async function readTranscriptTail(filePath: string): Promise<ReturnType<typeof parseTranscriptBuffer>> {
  if (!path.isAbsolute(filePath)) return undefined;
  let handle;
  try { handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK); }
  catch { return undefined; }
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size <= 0) return undefined;
    const start = Math.max(0, info.size - MAX_CHECKPOINT_TRANSCRIPT_BYTES);
    const length = info.size - start;
    const buffer = Buffer.alloc(length);
    let offset = 0;
    while (offset < length) {
      const { bytesRead } = await handle.read(buffer, offset, length - offset, start + offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return parseTranscriptBuffer(buffer.subarray(0, offset), start > 0);
  } catch { return undefined; }
  finally { await handle.close(); }
}
