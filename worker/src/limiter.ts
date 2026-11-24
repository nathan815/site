import { DurableObject } from 'cloudflare:workers';
import { check, endOfUtcDay, type Decision, type Limits, type State } from './ratelimit.ts';

// One instance per client IP (named by IP) plus one named 'global'. Storage is wiped at the end
// of each UTC day so idle instances don't accumulate.
export class RateLimiter extends DurableObject {
  async hit(limits: Limits): Promise<Decision> {
    const now = Date.now();
    // JSON can't carry Infinity: callers send null/large numbers, normalise here.
    const lim: Limits = { perMinute: limits.perMinute ?? Infinity, perDay: limits.perDay };
    const d = check(await this.ctx.storage.get<State>('s'), now, lim);
    if (d.allowed) {
      await this.ctx.storage.put('s', d.state);
      if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(endOfUtcDay(now));
    }
    return d;
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll();
  }
}
