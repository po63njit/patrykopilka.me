import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../.test-dist/index.js';

function createTestEnv(initialCount = 0) {
  const store = { count: initialCount };

  return {
    COUNTER_DO: {
      idFromName(name) {
        return name;
      },
      get(_id) {
        return {
          async fetch(_url) {
            store.count += 1;
            return new Response(JSON.stringify({ count: store.count }), {
              headers: { 'content-type': 'application/json' },
            });
          },
        };
      },
    },
  };
}

test('GET /health returns ok + service name', async () => {
  const res = await app.request('/health', {}, createTestEnv());
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.deepEqual(body, { ok: true, service: 'patrykopilka-api' });
});

test('POST /echo returns empty object when payload is invalid json', async () => {
  const res = await app.request(
    '/echo',
    {
      method: 'POST',
      body: '{not-valid-json',
      headers: { 'content-type': 'application/json' },
    },
    createTestEnv(),
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { youSent: {} });
});

test('GET /counter increments across sequential requests', async () => {
  const env = createTestEnv();

  const first = await app.request('/counter', {}, env);
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { count: 1 });

  const second = await app.request('/counter', {}, env);
  assert.equal(second.status, 200);
  assert.deepEqual(await second.json(), { count: 2 });
});
