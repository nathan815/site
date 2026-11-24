// Conversation logging to D1. Kept free of Cloudflare imports so it runs under plain Node tests.
// Logging must never break or slow the chat: every failure is swallowed.

export interface D1Like {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}
export interface LogEnv {
  DB?: D1Like;
  LOG_SALT?: string;
  LOG_RETENTION_DAYS?: string;
}
export interface WaitContext {
  waitUntil(p: Promise<unknown>): void;
}
export type Outcome = 'ok' | 'canned' | 'rate_limited_minute' | 'rate_limited_day' | 'rate_limited_global' | 'unavailable';
export interface LogEntry {
  outcome: Outcome;
  question: string;
  answer?: string;
  tools?: string[];
  askNathan?: boolean;
  turns: number;
  latencyMs: number;
  model?: string;
  error?: string;
}

const MAX_TEXT = 8000;
const clip = (s: string | undefined) => (s === undefined ? null : s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)} [clipped]` : s);

/** sha256 of the IP with a per-day salt: lets you count distinct visitors per day, not follow them across days. */
export async function ipHash(ip: string, salt: string | undefined, now: number): Promise<string> {
  const day = new Date(now).toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt ?? ''}:${day}:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fire and forget. Returns immediately; the write happens under waitUntil. */
export function logChat(env: LogEnv, ctx: WaitContext | undefined, ip: string, entry: LogEntry, now = Date.now()): void {
  if (!env.DB) return;
  const db = env.DB;
  const write = (async () => {
    try {
      await db
        .prepare('INSERT INTO chat_log (ts, ip_hash, outcome, question, answer, tools, asked_nathan, turns, latency_ms, model, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(
          new Date(now).toISOString(),
          await ipHash(ip, env.LOG_SALT, now),
          entry.outcome,
          clip(entry.question),
          clip(entry.answer),
          entry.tools?.length ? JSON.stringify(entry.tools) : null,
          entry.askNathan ? 1 : 0,
          entry.turns,
          Math.round(entry.latencyMs),
          entry.model ?? null,
          entry.error ? entry.error.slice(0, 300) : null,
        )
        .run();
    } catch {
      /* logging is best effort */
    }
  })();
  ctx?.waitUntil(write);
}

/** Deletes rows older than the retention window (default 90 days). Run from the daily cron. */
export async function purgeOld(env: LogEnv, now = Date.now()): Promise<void> {
  if (!env.DB) return;
  const n = Number(env.LOG_RETENTION_DAYS);
  const days = Number.isFinite(n) && n > 0 ? n : 90;
  try {
    await env.DB.prepare('DELETE FROM chat_log WHERE ts < ?').bind(new Date(now - days * 86_400_000).toISOString()).run();
  } catch {
    /* try again tomorrow */
  }
}

/**
 * Passes an SSE stream through unchanged while collecting the answer text from its
 * `{"response": ...}` events. onDone fires once, on normal end or when the client disconnects.
 */
export function tap(stream: ReadableStream, onDone: (text: string, completed: boolean) => void): ReadableStream {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let text = '';
  let finished = false;
  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    scan('\n'); // flush a final line that had no trailing newline
    onDone(text, completed);
  };
  const scan = (chunk: string) => {
    const lines = (buf + chunk).split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const r = (JSON.parse(payload) as { response?: unknown }).response;
        if (typeof r === 'string') text += r;
        else if (typeof r === 'number') text += String(r); // numeric tokens arrive as JSON numbers
      } catch {
        /* not JSON: ignore */
      }
    }
  };
  return new ReadableStream({
    async pull(c) {
      try {
        const { done, value } = await reader.read();
        if (done) { finish(true); c.close(); return; }
        scan(dec.decode(value, { stream: true }));
        c.enqueue(value);
      } catch (e) {
        finish(false);
        c.error(e);
      }
    },
    cancel(reason) {
      finish(false);
      return reader.cancel(reason);
    },
  });
}
