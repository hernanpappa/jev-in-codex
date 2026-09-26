import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Jev } from '../src/jev.js';
import { Service } from '../src/service.js';
import { Workspace } from '../src/workspace.js';
import { resolveJevProvider } from '../src/provider.js';

test('all four tools expose configured route and distinguish Jev from local fallback', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'jev-provider-tools-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'database.ts'), 'database rollback transaction\n');
  await writeFile(path.join(root, 'output.txt'), 'database rollback failed\n');
  const workspace = await Workspace.create(root);
  for (const route of ['typesafe', 'vercel'] as const) {
    for (const remote of [false, true]) {
      let calls = 0;
      const provider = resolveJevProvider({ JEV_PROVIDER: route, [route === 'vercel' ? 'AI_GATEWAY_API_KEY' : 'TYPESAFE_API_KEY']:
        remote ? 'synthetic-key' : undefined });
      const jev = new Jev({ ...provider, fetch: (async (_url, init) => {
        calls++;
        const body = JSON.parse(init!.body as string);
        return Response.json({ model: body.model, answers: Object.fromEntries(Object.keys(body.questions).map(id =>
          [id, { type: 'noul', noul: 0.9 }])) });
      }) as typeof fetch });
      const service = new Service(workspace, jev, remote);
      const results = [
        await service.select('database rollback', [{ id: 'db', kind: 'tool', description: 'database rollback' }], 1),
        await service.search('database', ['src'], [], 1),
        await service.triage('database', 'output.txt', 1, undefined, 1),
        await service.checkpoint('database', [{ role: 'user', text: 'Preserve database rollback' }], 1),
      ];
      for (const result of results) {
        assert.equal(result.provider_route, route);
        assert.equal(result.method, remote ? 'jev' : 'local_fallback');
        assert.equal(result.score_kind, remote ? 'noul' : 'lexical_overlap');
        assert.equal(result.api_requests, remote ? 1 : 0);
        if (remote) assert.equal(result.model, route === 'vercel' ? 'typesafe-ai/jev' : 'jev-latest');
      }
      assert.equal(calls, remote ? 4 : 0);
      if (remote) {
        const localCheckpoint = await new Service(workspace, jev, false)
          .checkpoint('database', [{ role: 'user', text: 'Preserve database rollback' }], 1);
        assert.equal(localCheckpoint.method, 'local_fallback');
        assert.equal(localCheckpoint.provider_route, route);
        assert.equal(calls, 4);
      }
    }
  }
});
