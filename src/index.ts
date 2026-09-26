#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { Jev } from './jev.js';
import { Workspace } from './workspace.js';
import { Service } from './service.js';
import { createServer } from './server.js';
import { InvalidProviderError, resolveJevProvider } from './provider.js';

try {
  const { values } = parseArgs({ options: { root: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) {
    console.log('Usage: jev-in-codex --root /absolute/workspace\nOr set JEV_WORKSPACE_ROOT. Requires Node 22+ and ripgrep.\nJEV_PROVIDER=typesafe|vercel selects one remote route (default: typesafe).\nUse TYPESAFE_API_KEY for TypeSafe or AI_GATEWAY_API_KEY for Vercel AI Gateway; without the selected key tools use local fallback.\nJEV_MODEL optionally overrides jev-latest on the direct TypeSafe route only.');
  } else {
    const root = values.root ?? process.env.JEV_WORKSPACE_ROOT;
    if (!root) throw new Error('Supply --root or JEV_WORKSPACE_ROOT explicitly.');
    const provider = resolveJevProvider(process.env);
    const workspace = await Workspace.create(root);
    const service = new Service(workspace, new Jev(provider),
      process.env.JEV_ALLOW_CHECKPOINT_EGRESS === 'true');
    await serveStdio(() => createServer(service));
  }
} catch (error) {
  console.error(error instanceof InvalidProviderError ? `jev-in-codex: ${error.message}` :
    'jev-in-codex: startup failed. Supply a readable workspace with --root or JEV_WORKSPACE_ROOT. Use --help for usage.');
  process.exitCode = 1;
}
