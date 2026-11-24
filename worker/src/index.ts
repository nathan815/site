import { handle, type Env } from './handler.ts';
import { purgeOld } from './chatlog.ts';

export { Counter } from './counter.ts';
export { RateLimiter } from './limiter.ts';

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => handle(request, env, ctx),
  // Daily cron (see wrangler.toml): drop chat log rows past the retention window.
  scheduled: (_event: ScheduledController, env: Env, ctx: ExecutionContext) => { ctx.waitUntil(purgeOld(env)); },
} satisfies ExportedHandler<Env>;
