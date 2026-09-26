import test from 'node:test';
import assert from 'node:assert/strict';
import { Jev } from '../src/jev.js';
import { resolveJevProvider } from '../src/provider.js';

const candidates = [ { id: 'a', text: 'Inspect database queries' }, { id: 'b', text: 'Draw interface mockups' } ];
const fake = (handler: (body: any, init: RequestInit, url: string) => Response | Promise<Response>): typeof fetch =>
  (async (url, init) => handler(JSON.parse(init!.body as string), init!, String(url))) as typeof fetch;

test('missing key is an explicit offline fallback with no request', async () => {
  const result = await new Jev({ fetch: fake(() => { throw new Error('Must not fetch'); }) }).rank('database queries', candidates);
  assert.equal(result.method, 'local_fallback');
  assert.equal(result.score_kind, 'lexical_overlap');
  assert.equal(result.ranked[0].id, 'a');
  assert.equal(result.api_requests, 0);
  assert.equal(result.provider_route, 'typesafe');
});

test('Jev response controls rank and each question references its own candidate', async () => {
  const result = await new Jev({ apiKey: 'test-key', fetch: fake((body, init) => {
    assert.equal(body.model, 'jev-latest');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer test-key');
    assert.match(body.questions.q1.instructions, /candidates\[1\]/);
    assert.equal(body.state.objective, 'database queries');
    return Response.json({ model: 'jev-test', answers: { q0: { type: 'noul', noul: 0.1 }, q1: { type: 'noul', noul: 0.9 } } });
  }) }).rank('database queries', candidates);
  assert.equal(result.method, 'jev');
  assert.equal(result.provider_route, 'typesafe');
  assert.equal(result.model, 'jev-test');
  assert.equal(result.ranked[0].id, 'b');
});

test('selected route alone determines endpoint, bearer key and request model', async () => {
  const environment = { TYPESAFE_API_KEY: 'direct-key', AI_GATEWAY_API_KEY: 'gateway-key', JEV_MODEL: 'direct-custom' };
  for (const [route, endpoint, bearer, model] of [
    ['typesafe', 'https://api.typesafe.ai/v1/systemone', 'direct-key', 'direct-custom'],
    ['vercel', 'https://ai-gateway.vercel.sh/typesafe/v1/systemone', 'gateway-key', 'typesafe-ai/jev'],
  ] as const) {
    let requests = 0;
    const jev = new Jev({ ...resolveJevProvider({ ...environment, JEV_PROVIDER: route }),
      fetch: fake((body, init, url) => {
        requests++;
        assert.equal(url, endpoint);
        assert.equal((init.headers as Record<string, string>).Authorization, `Bearer ${bearer}`);
        assert.equal(body.model, model);
        assert.equal(init.method, 'POST');
        assert.equal(init.redirect, 'error');
        assert.equal(body.state.objective, 'database queries');
        return Response.json({ answers: { q0: { type: 'noul', noul: 0.9 }, q1: { type: 'noul', noul: 0.1 } } });
      }) });
    const result = await jev.rank('database queries', candidates);
    assert.equal(result.method, 'jev');
    assert.equal(result.provider_route, route);
    assert.equal(result.model, model);
    assert.equal(requests, 1);
  }
});

for (const [label, response] of [
  ['missing answers', {}],
  ['out of range', { answers: { q0: { type: 'noul', noul: 2 }, q1: { type: 'noul', noul: 0.5 } } }],
  ['missing candidate', { answers: { q0: { type: 'noul', noul: 0.5 } } }],
  ['wrong primitive', { answers: { q0: { type: 'choice', noul: 0.5 } } }],
] as const) {
  test(`malformed response falls back: ${label}`, async () => {
    const result = await new Jev({ apiKey: 'secret', fetch: fake(() => Response.json(response)) }).rank('database', candidates);
    assert.equal(result.method, 'local_fallback');
    assert.equal(result.ranked.length, 2);
  });
}

test('a later failed batch discards all Jev scores and hides provider error details', async () => {
  let count = 0;
  const items = Array.from({ length: 7 }, (_, i) => ({ id: String(i), text: i === 6 ? 'database' : 'unrelated' }));
  const result = await new Jev({ apiKey: 'secret', fetch: fake(body => {
    assert.ok(body.state.candidates.length <= 4);
    if (++count === 2) return new Response('secret echoed in an error', { status: 429 });
    return Response.json({ answers: Object.fromEntries(Object.keys(body.questions).map(id => [id, { type: 'noul', noul: 0.99 }])) });
  }) }).rank('database', items);
  assert.equal(result.method, 'local_fallback');
  assert.equal(result.ranked[0].id, '6');
  assert.equal(result.ranked[1].score, 0);
  assert.equal(result.api_requests, 2);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('network exceptions are sanitized', async () => {
  const result = await new Jev({ apiKey: 'secret', fetch: fake(() => { throw new Error('secret'); }) }).rank('database', candidates);
  assert.equal(result.method, 'local_fallback');
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('both routes bound batches, bytes, timeout, redirect policy and reject malformed Noul answers', async () => {
  for (const route of ['typesafe', 'vercel'] as const) {
    let requests = 0;
    const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i), text: 'database' }));
    const fetcher = fake((body, init) => {
      requests++;
      assert.ok(body.state.candidates.length <= 4);
      assert.ok(Buffer.byteLength(init.body as string) <= 28_000);
      assert.equal(init.redirect, 'error');
      assert.ok(init.signal);
      return Response.json({ answers: Object.fromEntries(Object.keys(body.questions).map(id =>
        [id, { type: 'noul', noul: 0.8 }])) });
    });
    const options = { providerRoute: route, apiKey: 'synthetic', fetch: fetcher };
    const result = await new Jev(options).rank('database', items);
    assert.equal(result.method, 'jev');
    assert.equal(result.api_requests, 2);
    assert.equal(requests, 2);
    const oversized = await new Jev(options).rank('database', [{ id: 'large', text: 'x'.repeat(28_000) }]);
    assert.equal(oversized.method, 'local_fallback');
    assert.equal(oversized.api_requests, 0);
    assert.equal(requests, 2);
    const malformed = await new Jev({ ...options, fetch: fake(() => Response.json({ answers: { q0: { type: 'noul', noul: 1.5 } } })) })
      .rank('database', candidates.slice(0, 1));
    assert.equal(malformed.method, 'local_fallback');
    assert.equal(malformed.api_requests, 1);
    const timedOut = await new Jev({ ...options, timeoutMs: 5, fetch: (async (_url, init) => {
      await new Promise((_, reject) => {
        const hold = setTimeout(() => reject(new Error('timeout listener failed')), 100);
        init?.signal?.addEventListener('abort', () => { clearTimeout(hold); reject(new Error('secret timeout detail')); }, { once: true });
      });
      throw new Error('unreachable');
    }) as typeof fetch }).rank('database', candidates.slice(0, 1));
    assert.equal(timedOut.method, 'local_fallback');
    assert.equal(timedOut.api_requests, 1);
    assert.ok(!JSON.stringify(timedOut).includes('secret timeout detail'));
  }
});

test('Vercel missing key or later failure never switches to a configured TypeSafe key', async () => {
  const missing = resolveJevProvider({ JEV_PROVIDER: 'vercel', TYPESAFE_API_KEY: 'direct-key' });
  let calls = 0;
  const absent = await new Jev({ ...missing, fetch: fake(() => { calls++; throw new Error('must not fetch'); }) })
    .rank('database', candidates);
  assert.equal(absent.method, 'local_fallback');
  assert.equal(absent.provider_route, 'vercel');
  assert.match(absent.fallback_reason ?? '', /AI_GATEWAY_API_KEY/);
  assert.equal(absent.api_requests, 0);
  assert.equal(calls, 0);

  const items = Array.from({ length: 6 }, (_, i) => ({ id: String(i), text: i === 5 ? 'database' : 'other' }));
  const configured = resolveJevProvider({ JEV_PROVIDER: 'vercel', AI_GATEWAY_API_KEY: 'gateway-key', TYPESAFE_API_KEY: 'direct-key' });
  const failed = await new Jev({ ...configured, fetch: fake((body, _init, url) => {
    calls++;
    assert.equal(url, 'https://ai-gateway.vercel.sh/typesafe/v1/systemone');
    if (calls === 2) return new Response('sensitive body direct-key gateway-key', { status: 503 });
    return Response.json({ answers: Object.fromEntries(Object.keys(body.questions).map(id =>
      [id, { type: 'noul', noul: 0.99 }])) });
  }) }).rank('database', items);
  assert.equal(failed.method, 'local_fallback');
  assert.equal(failed.provider_route, 'vercel');
  assert.equal(failed.ranked[0].id, '5');
  assert.equal(failed.api_requests, 2);
  assert.equal(calls, 2);
  assert.ok(!JSON.stringify(failed).includes('direct-key'));
  assert.ok(!JSON.stringify(failed).includes('gateway-key'));
});
