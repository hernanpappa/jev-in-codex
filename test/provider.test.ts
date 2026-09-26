import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveJevProvider, InvalidProviderError } from '../src/provider.js';

test('TypeSafe remains the default and uses only its own settings', () => {
  assert.deepEqual(resolveJevProvider({ TYPESAFE_API_KEY: 'direct', AI_GATEWAY_API_KEY: 'gateway', JEV_MODEL: 'custom' }),
    { providerRoute: 'typesafe', apiKey: 'direct', model: 'custom' });
  assert.deepEqual(resolveJevProvider({}), { providerRoute: 'typesafe', apiKey: undefined, model: 'jev-latest' });
});

test('Vercel ignores TypeSafe key and model', () => {
  assert.deepEqual(resolveJevProvider({ JEV_PROVIDER: 'vercel', TYPESAFE_API_KEY: 'direct',
    AI_GATEWAY_API_KEY: 'gateway', JEV_MODEL: 'custom' }),
  { providerRoute: 'vercel', apiKey: 'gateway', model: 'typesafe-ai/jev' });
});

test('unknown provider is rejected without echoing its value', () => {
  assert.throws(() => resolveJevProvider({ JEV_PROVIDER: 'sensitive-value' }), error =>
    error instanceof InvalidProviderError && !error.message.includes('sensitive-value'));
});
