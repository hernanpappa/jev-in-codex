export type JevProviderRoute = 'typesafe' | 'vercel';

export type ProviderEnvironment = Record<string, string | undefined>;
export type ProviderConfiguration = {
  providerRoute: JevProviderRoute;
  apiKey?: string;
  model: string;
};

export class InvalidProviderError extends Error {
  constructor() {
    super('Invalid JEV_PROVIDER. Expected typesafe or vercel.');
  }
}

/** Select one route without retaining the other route's credential. */
export function resolveJevProvider(env: ProviderEnvironment): ProviderConfiguration {
  const route = env.JEV_PROVIDER ?? 'typesafe';
  if (route === 'typesafe') {
    return { providerRoute: route, apiKey: env.TYPESAFE_API_KEY, model: env.JEV_MODEL ?? 'jev-latest' };
  }
  if (route === 'vercel') {
    return { providerRoute: route, apiKey: env.AI_GATEWAY_API_KEY, model: 'typesafe-ai/jev' };
  }
  throw new InvalidProviderError();
}
