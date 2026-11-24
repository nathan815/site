// Page-view bookkeeping. Pure logic over a tiny storage interface so it runs under plain
// Node in tests and inside the Durable Object in production.

export interface Views {
  total: number;
  week: number;
}
export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(keys: string[]): Promise<unknown>;
  list(options: { prefix: string }): Promise<Map<string, unknown>>;
}

const DAY = 'd:';
const WEEK_DAYS = 7;

const dayKey = (d: Date) => DAY + d.toISOString().slice(0, 10);

/** Total views plus views in the last 7 days (today and the 6 days before it). */
export async function readViews(kv: KV, now: Date): Promise<Views> {
  const total = (await kv.get<number>('total')) ?? 0;
  const days = await kv.list({ prefix: DAY });
  const cutoff = dayKey(new Date(now.getTime() - (WEEK_DAYS - 1) * 86_400_000));
  let week = 0;
  for (const [key, n] of days) if (key >= cutoff) week += n as number;
  return { total, week };
}

export async function recordView(kv: KV, now: Date): Promise<Views> {
  const key = dayKey(now);
  await kv.put(key, ((await kv.get<number>(key)) ?? 0) + 1);
  await kv.put('total', ((await kv.get<number>('total')) ?? 0) + 1);
  // Drop day buckets that fell out of the window; the running total keeps the history.
  const cutoff = dayKey(new Date(now.getTime() - (WEEK_DAYS - 1) * 86_400_000));
  const stale = [...(await kv.list({ prefix: DAY })).keys()].filter((k) => k < cutoff);
  if (stale.length) await kv.delete(stale);
  return readViews(kv, now);
}
