// Request handling for the site's backend. Kept free of Cloudflare-specific imports so it
// can be unit tested under plain Node.

export interface CounterStub {
  increment(): Promise<number>;
}
export interface CounterNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): CounterStub;
}
export interface Env {
  ALLOWED_ORIGINS?: string;
  VERSION?: string;
  COUNTER?: CounterNamespace;
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

export async function handle(request: Request, env: Env): Promise<Response> {
  const base: Record<string, string> = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };

  // CORS: browsers send Origin on cross-origin calls. Only the allowlist gets through.
  const origin = request.headers.get('Origin');
  if (origin) {
    if (!allowedOrigins(env).has(origin)) return new Response('origin not allowed', { status: 403, headers: base });
    base['Access-Control-Allow-Origin'] = origin;
    base['Vary'] = 'Origin';
    base['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    base['Access-Control-Max-Age'] = '600';
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: base });

  const { pathname } = new URL(request.url);
  const region = (request as unknown as WithColo).cf?.colo ?? null;

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
