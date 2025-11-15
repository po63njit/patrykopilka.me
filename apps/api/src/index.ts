import { Hono } from 'hono';

export interface Env {
  COUNTER_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/health', (c) => c.json({ ok: true, service: 'patrykopilka-api' }));

app.post('/echo', async (c) => {
  const data = await c.req.json().catch(() => ({}));
  return c.json({ youSent: data });
});

app.get('/counter', async (c) => {
  const id = c.env.COUNTER_DO.idFromName('global');
  const stub = c.env.COUNTER_DO.get(id);
  const res = await stub.fetch('https://do/counter');
  return c.json(await res.json());
});

export default app;

export class CounterDO implements DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname === '/counter') {
      let count = (await this.state.storage.get<number>('count')) || 0;
      count += 1;
      await this.state.storage.put('count', count);
      return Response.json({ count });
    }

    return new Response('Not found', { status: 404 });
  }
}
