import { handle, type Env } from './handler.ts';

export { Counter } from './counter.ts';

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
} satisfies ExportedHandler<Env>;
