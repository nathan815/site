// Request handling for the site's backend. Kept free of Cloudflare-specific imports so it
// can be unit tested under plain Node.
import { systemPromptFor, wantsContact, withholdGithubTools } from './prompt.ts';
import type { Decision, Limits } from './ratelimit.ts';
import { ASK_NATHAN_TOOL, TOOLS, runTool } from './tools.ts';
import { cannedReply } from './canned.ts';
import { logChat, tap, type D1Like, type WaitContext } from './chatlog.ts';

import type { Views } from './views.ts';

export interface CounterStub {
  increment(): Promise<number>;
  hit(): Promise<Views>;
  views(): Promise<Views>;
}
export interface CounterNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): CounterStub;
}
export interface LimiterStub {
  hit(limits: Limits): Promise<Decision>;
}
export interface LimiterNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): LimiterStub;
}
export interface AiBinding {
  run(model: string, input: unknown): Promise<unknown>;
}
export interface Env {
  ALLOWED_ORIGINS?: string;
  VERSION?: string;
  COUNTER?: CounterNamespace;
  AI?: AiBinding;
  LIMITER?: LimiterNamespace;
  CHAT_MODEL?: string;
  GITHUB_USER?: string;
  GITHUB_TOKEN?: string;
  CHAT_PER_MINUTE?: string;
  CHAT_PER_DAY?: string;
  CHAT_GLOBAL_PER_DAY?: string;
  CANNED_STREAM_MS?: string; // typewriter step for fixed replies (default 35)
  DB?: D1Like;
  LOG_SALT?: string;
  LOG_RETENTION_DAYS?: string;
}
interface WithColo {
  cf?: { colo?: string };
}

const DEFAULT_ORIGINS = 'https://nathancj.com,http://localhost:4321';

function allowedOrigins(env: Env): Set<string> {
  return new Set((env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((o) => o.trim()).filter(Boolean));
}

function json(body: unknown, init: ResponseInit, extra: Record<string, string>): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(JSON.stringify(body), { ...init, headers });
}

export async function handle(request: Request, env: Env, ctx?: WaitContext): Promise<Response> {
  const base: Record<string, string> = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };

  // CORS: browsers send Origin on cross-origin calls. Only the allowlist gets through.
  const origin = request.headers.get('Origin');
  if (origin) {
    if (!allowedOrigins(env).has(origin)) return new Response('origin not allowed', { status: 403, headers: base });
    base['Access-Control-Allow-Origin'] = origin;
    base['Vary'] = 'Origin';
    base['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    base['Access-Control-Allow-Headers'] = 'Content-Type';
    base['Access-Control-Expose-Headers'] = 'X-RateLimit-Limit-Day, X-RateLimit-Remaining-Day, Retry-After';
    base['Access-Control-Max-Age'] = '600';
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: base });

  const { pathname } = new URL(request.url);
  const region = (request as unknown as WithColo).cf?.colo ?? null;

  if (pathname === '/api/views') {
    // GET reads the counts; POST records one view and returns the updated counts.
    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'method not allowed' }, { status: 405 }, { ...base, Allow: 'GET, POST, OPTIONS' });
    }
    if (!env.COUNTER) return json({ error: 'counter unavailable' }, { status: 503 }, base);
    try {
      const stub = env.COUNTER.get(env.COUNTER.idFromName('global'));
      return json(request.method === 'POST' ? await stub.hit() : await stub.views(), { status: 200 }, base);
    } catch {
      return json({ error: 'counter unavailable' }, { status: 503 }, base);
    }
  }

  if (pathname === '/api/chat') return chat(request, env, base, ctx);

  if (pathname !== '/health' && pathname !== '/api/status') {
    return json({ error: 'not found' }, { status: 404 }, base);
  }
  if (request.method !== 'GET') {
    return json({ error: 'method not allowed' }, { status: 405 }, { ...base, Allow: 'GET, OPTIONS' });
  }

  if (pathname === '/health') return json({ ok: true, region }, { status: 200 }, base);

  let requests: number | null = null;
  if (env.COUNTER) {
    try {
      requests = await env.COUNTER.get(env.COUNTER.idFromName('global')).increment();
    } catch {
      requests = null; // the counter is a nicety: never fail the endpoint because of it
    }
  }
  return json(
    {
      status: 'ok',
      version: env.VERSION ?? 'dev',
      runtime: 'cloudflare-workers',
      region,
      time: new Date().toISOString(),
      requests,
    },
    { status: 200 },
    base,
  );
}

// ---- /api/chat ----

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const MAX_MESSAGES = 12;
const MAX_USER_CHARS = 500;
const MAX_ASSISTANT_CHARS = 2000;
const MAX_BODY_BYTES = 40_000; // 12 messages: up to 2000 chars of assistant history each plus JSON overhead

interface ChatMessage { role: 'user' | 'assistant'; content: string }

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
};

function chatError(status: number, error: string, message: string, base: Record<string, string>, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}): Response {
  return json({ error, message, ...extra }, { status }, { ...base, ...headers });
}

/** Returns the cleaned messages, or null when the body is not a valid chat request. */
export function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MESSAGES) return null;
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (typeof m !== 'object' || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    let text = content.trim();
    // The model's own earlier answers are context, not input to police: clip them instead of failing the whole request.
    if (role === 'assistant' && text.length > MAX_ASSISTANT_CHARS) text = text.slice(0, MAX_ASSISTANT_CHARS);
    if (text.length < (role === 'user' ? 1 : 0) || (role === 'user' && text.length > MAX_USER_CHARS)) return null;
    out.push({ role, content: text });
  }
  return out[out.length - 1].role === 'user' ? out : null;
}

const MAX_TOKENS = 700;
const MAX_TOOL_HOPS = 3; // model rounds that may call tools before we force a final answer
const MAX_CALLS_PER_HOP = 3;
// 8B models sometimes emit a malformed tool call as ordinary text, e.g. [{"name":"get_repo_file",...}].
const LOOKS_LIKE_TOOL_CALL = /^\s*\[?\s*\{\s*\\?"?(name|function)\\?"?\s*[:,]/i;

interface ToolCall { name: string; arguments?: unknown }
type AiMessage = { role: string; content: string; name?: string };

const ACTION_EVENT = (action: string) => `data: ${JSON.stringify({ action })}\n\n`;

/** One-event SSE stream in the same shape Workers AI streams, for answers that arrive whole. */
function sseOf(text: string, action?: string): ReadableStream {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ response: text })}\n\n${action ? ACTION_EVENT(action) : ''}data: [DONE]\n\n`));
      c.close();
    },
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Streams a fixed reply a couple of words at a time so it reads like a live answer: a short "thinking" pause
 * first, then slightly uneven steps. stepMs = 0 sends everything at once (tests).
 */
function typewriter(text: string, stepMs: number): ReadableStream {
  const enc = new TextEncoder();
  const words = text.match(/\S+\s*/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 2) chunks.push(words.slice(i, i + 2).join(''));
  let next = -1;
  return new ReadableStream({
    async pull(c) {
      if (next === -1) { next = 0; if (stepMs > 0) await sleep(stepMs * 10); }
      else if (stepMs > 0) await sleep(stepMs * (0.6 + Math.random() * 0.8));
      if (next < chunks.length) c.enqueue(enc.encode(`data: ${JSON.stringify({ response: chunks[next++] })}\n\n`));
      else { c.enqueue(enc.encode('data: [DONE]\n\n')); c.close(); }
    },
  });
}

/** Appends a UI action event after an upstream SSE stream ends. */
function withAction(stream: ReadableStream, action: string | undefined): ReadableStream {
  if (!action) return stream;
  const enc = new TextEncoder();
  return stream.pipeThrough(new TransformStream({ flush: (c) => c.enqueue(enc.encode(ACTION_EVENT(action))) }));
}

/**
 * Lets the model call GitHub tools for up to MAX_TOOL_HOPS rounds (non-streaming, since a tool
 * call is not an answer), then streams the final answer. An answer produced during a tool round
 * is sent as a single SSE event; the browser handles both the same way.
 */
interface Answer { stream: ReadableStream; tools: string[]; askNathan: boolean; model: string }

async function answer(env: Env, messages: ChatMessage[]): Promise<Answer> {
  const ai = env.AI!;
  const model = env.CHAT_MODEL || DEFAULT_MODEL;
  const question = messages[messages.length - 1].content;
  const convo: AiMessage[] = [{ role: 'system', content: systemPromptFor(question) }, ...messages];
  // Contact questions are answered directly (email, LinkedIn, contact button), so the "ask Nathan" offer is withheld.
  const githubTools = new Set(['list_github_repos', 'get_repo_readme', 'get_repo_recent_commits', 'get_repo_tree', 'get_repo_file']);
  // Questions about his internal Microsoft work are always answerable from the context, so they get no tools at all
  // (with only ask_nathan left, a small model tends to call it).
  const internal = withholdGithubTools(question);
  const tools = internal
    ? []
    : TOOLS.filter((t) => !(wantsContact(question) && t.name === ASK_NATHAN_TOOL) && (!internal || !githubTools.has(t.name)));
  const allowed = new Set(tools.map((t) => t.name));

  let action: string | undefined; // UI action for the browser, set by tools that are not data lookups
  const used: string[] = []; // names of tools the model called, for the log
  const result = (stream: ReadableStream): Answer => ({ stream, tools: used, askNathan: action === 'ask_nathan', model });

  for (let hop = 0; hop < (tools.length ? MAX_TOOL_HOPS : 0); hop++) {
    const res = (await ai.run(model, { messages: convo, tools, max_tokens: MAX_TOKENS })) as { response?: unknown; tool_calls?: ToolCall[] } | string;
    const calls = typeof res === 'object' && Array.isArray(res.tool_calls) ? res.tool_calls.slice(0, MAX_CALLS_PER_HOP) : [];
    if (!calls.length) {
      const text = typeof res === 'string' ? res : typeof res?.response === 'string' ? res.response : '';
      if (!text.trim()) throw new Error('empty response');
      if (LOOKS_LIKE_TOOL_CALL.test(text)) break; // the model wrote a tool call as plain text: answer again without tools
      return result(sseOf(text, action));
    }
    convo.push({ role: 'assistant', content: JSON.stringify(calls) });
    for (const call of calls) {
      let out: string;
      if (!allowed.has(String(call.name))) {
        out = 'error: that tool is not available for this question. Answer directly.'; // the model may name tools it was not offered
      } else if (call.name === ASK_NATHAN_TOOL) {
        used.push(ASK_NATHAN_TOOL);
        action = 'ask_nathan';
        out = 'The visitor will now be offered a button to send this question to Nathan. Tell them briefly, in one or two sentences, that you do not have that information. Do not mention the tool or the button.';
      } else {
        used.push(String(call.name));
        out = await runTool(String(call.name), call.arguments, env);
      }
      convo.push({ role: 'tool', name: String(call.name), content: out });
    }
  }
  // Tool budget spent: answer from what was gathered, streaming, with no further tool calls.
  const stream = await ai.run(model, { messages: convo, max_tokens: MAX_TOKENS, stream: true });
  if (!(stream instanceof ReadableStream)) throw new Error('no stream');
  return result(withAction(stream, action));
}

async function chat(request: Request, env: Env, base: Record<string, string>, ctx?: WaitContext): Promise<Response> {
  const t0 = Date.now();
  if (request.method !== 'POST') {
    return chatError(405, 'method_not_allowed', 'Use POST for this endpoint.', base, {}, { Allow: 'POST, OPTIONS' });
  }
  const bad = () => chatError(400, 'invalid_request', 'That message could not be understood. Keep it under 500 characters and try again.', base);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return bad();
  let body: unknown;
  try { body = JSON.parse(text); } catch { return bad(); }
  const messages = parseMessages(body);
  if (!messages) return bad();

  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';

  // Preset questions get a fixed answer: no model call, no rate-limit cost, works even when AI is unavailable.
  const fixed = cannedReply(messages[messages.length - 1].content);
  if (fixed) {
    logChat(env, ctx, ip, { outcome: 'canned', question: messages[messages.length - 1].content, answer: fixed, turns: messages.length, latencyMs: Date.now() - t0 });
    return new Response(typewriter(fixed, env.CANNED_STREAM_MS === undefined ? 35 : Math.max(0, Number(env.CANNED_STREAM_MS) || 0)), { status: 200, headers: { ...base, 'Content-Type': 'text/event-stream' } });
  }

  const unavailable = () => chatError(503, 'unavailable', "The chat is unavailable right now. Please email Nathan instead, or try again later.", base);
  if (!env.AI || !env.LIMITER) return unavailable(); // fail closed: never run the model without a limiter

  const perDay = num(env.CHAT_PER_DAY, 30);
  const question = messages[messages.length - 1].content;
  const base_ = { question, turns: messages.length, model: env.CHAT_MODEL || DEFAULT_MODEL };
  let decision: Decision;
  try {
    const ipStub = env.LIMITER.get(env.LIMITER.idFromName(`ip:${ip}`));
    decision = await ipStub.hit({ perMinute: num(env.CHAT_PER_MINUTE, 5), perDay });
    let scope: 'minute' | 'day' | 'global' | undefined = decision.allowed ? undefined : decision.scope;
    if (decision.allowed) {
      const g = await env.LIMITER.get(env.LIMITER.idFromName('global')).hit({ perMinute: Infinity, perDay: num(env.CHAT_GLOBAL_PER_DAY, 120) });
      if (!g.allowed) { decision = g; scope = 'global'; }
    }
    if (!decision.allowed) {
      const retryAfter = decision.retryAfter ?? 60;
      const messageByScope = {
        minute: 'You are sending messages too quickly. Please wait a moment and try again.',
        day: "You've reached today's message limit. Please come back tomorrow, or email Nathan directly.",
        global: "The chat has reached its daily capacity. Please come back tomorrow, or email Nathan directly.",
      } as const;
      logChat(env, ctx, ip, { ...base_, outcome: `rate_limited_${scope ?? 'day'}`, latencyMs: Date.now() - t0 });
      return chatError(429, 'rate_limited', messageByScope[scope ?? 'day'], base, { retryAfter, scope: scope ?? 'day' }, { 'Retry-After': String(retryAfter) });
    }
  } catch {
    return unavailable();
  }

  let result: Answer;
  try {
    result = await answer(env, messages);
  } catch (e) {
    logChat(env, ctx, ip, { ...base_, outcome: 'unavailable', latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) });
    return unavailable(); // includes Workers AI free-quota exhaustion
  }
  const stream = tap(result.stream, (text) =>
    logChat(env, ctx, ip, { ...base_, outcome: 'ok', answer: text, tools: result.tools, askNathan: result.askNathan, latencyMs: Date.now() - t0 }),
  );

  const headers = new Headers(base);
  headers.set('Content-Type', 'text/event-stream');
  headers.set('X-RateLimit-Limit-Day', String(perDay));
  headers.set('X-RateLimit-Remaining-Day', String(decision.remainingDay));
  return new Response(stream, { status: 200, headers });
}
