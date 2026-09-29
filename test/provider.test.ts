import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveJevProvider, InvalidProviderError } from '../src/provider.js';

test('OpenRouter is the default and uses only its own key and fixed Jev model', () => {
  assert.deepEqual(resolveJevProvider({ OPENROUTER_API_KEY: 'openrouter', TYPESAFE_API_KEY: 'direct',
    AI_GATEWAY_API_KEY: 'gateway', JEV_MODEL: 'custom' }),
  { providerRoute: 'openrouter', apiKey: 'openrouter', model: '~typesafe/jev-latest' });
  assert.deepEqual(resolveJevProvider({}),
    { providerRoute: 'openrouter', apiKey: undefined, model: '~typesafe/jev-latest' });
});

test('TypeSafe is explicit and uses only its own settings', () => {
  assert.deepEqual(resolveJevProvider({ JEV_PROVIDER: 'typesafe', OPENROUTER_API_KEY: 'openrouter',
    TYPESAFE_API_KEY: 'direct', AI_GATEWAY_API_KEY: 'gateway', JEV_MODEL: 'custom' }),
    { providerRoute: 'typesafe', apiKey: 'direct', model: 'custom' });
  assert.deepEqual(resolveJevProvider({ JEV_PROVIDER: 'typesafe' }),
    { providerRoute: 'typesafe', apiKey: undefined, model: 'jev-latest' });
});

test('Vercel ignores TypeSafe key and model', () => {
  assert.deepEqual(resolveJevProvider({ JEV_PROVIDER: 'vercel', OPENROUTER_API_KEY: 'openrouter', TYPESAFE_API_KEY: 'direct',
    AI_GATEWAY_API_KEY: 'gateway', JEV_MODEL: 'custom' }),
  { providerRoute: 'vercel', apiKey: 'gateway', model: 'typesafe-ai/jev' });
});

test('each selected route retains only its own credential when all keys are configured', () => {
  const env = { JEV_PROVIDER: 'openrouter', OPENROUTER_API_KEY: 'openrouter', TYPESAFE_API_KEY: 'direct', AI_GATEWAY_API_KEY: 'gateway' };
  for (const route of ['openrouter', 'typesafe', 'vercel'] as const) {
    const selected = resolveJevProvider({ ...env, JEV_PROVIDER: route });
    assert.equal(selected.providerRoute, route);
    assert.equal(selected.apiKey, route === 'openrouter' ? 'openrouter' : route === 'typesafe' ? 'direct' : 'gateway');
    assert.deepEqual(Object.keys(selected).sort(), ['apiKey', 'model', 'providerRoute']);
  }
});

test('unknown provider is rejected without echoing its value', () => {
  assert.throws(() => resolveJevProvider({ JEV_PROVIDER: 'sensitive-value' }), error =>
    error instanceof InvalidProviderError && !error.message.includes('sensitive-value') &&
      error.message.includes('openrouter, typesafe, or vercel'));
});
