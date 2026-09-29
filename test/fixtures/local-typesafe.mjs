// Test-only preload. The production entry point never imports this module.
// Redirect only the expected selected provider request to the loopback test server;
// unexpected destinations fail closed rather than reaching the internet.
const local = new URL(process.env.JEV_TEST_PROVIDER_URL ?? '');
if (local.protocol !== 'http:' || local.hostname !== '127.0.0.1' ||
    !['/v1/systemone', '/api/alpha/decisions'].includes(local.pathname) || !local.port || local.username ||
    local.password || local.search || local.hash) {
  throw new Error('Expected an explicit loopback TypeSafe test endpoint.');
}
const originalFetch = globalThis.fetch;
const expectedRemote = process.env.JEV_TEST_PROVIDER_ROUTE === 'openrouter'
  ? 'https://openrouter.ai/api/alpha/decisions'
  : process.env.JEV_TEST_PROVIDER_ROUTE === 'vercel'
    ? 'https://ai-gateway.vercel.sh/typesafe/v1/systemone'
    : 'https://api.typesafe.ai/v1/systemone';
globalThis.fetch = async (input, init) => {
  if (input !== expectedRemote) {
    throw new Error('Unexpected network destination in the local integration test.');
  }
  return originalFetch(local, init);
};
