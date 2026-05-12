import type { TVAppConfig } from './types';

let config: TVAppConfig | null = null;

export async function loadConfig(appId: string, overrideUrl?: string): Promise<TVAppConfig> {
  if (config) return config;

  const url = overrideUrl || `/${appId}/config.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    config = await res.json() as TVAppConfig;
  } catch {
    // Fallback defaults
    config = {
      apiBaseUrl: 'http://localhost:3001',
      marvinServiceUrl: 'https://marvin.bcms-cdn.prod.aws.kpn.com',
      appId,
      enableDRM: false,
      defaultCountry: 'NL',
    };
  }

  return config!;
}

export function getConfig(): TVAppConfig | null {
  return config;
}