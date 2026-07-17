export interface AppConfig {
  host: string;
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  databaseMaxConnections: number;
  clientDistDir?: string;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 8080;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} env not set`);
  }

  return value;
}

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
  name: string,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name} value: ${value}`);
  }

  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    host: env.HOST ?? '0.0.0.0',
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
    databaseUrl: requireEnv(env, 'DATABASE_URL'),
    databaseMaxConnections: parsePositiveInteger(
      env.DATABASE_MAX_CONNECTIONS,
      5,
      'DATABASE_MAX_CONNECTIONS',
    ),
  };

  if (env.CLIENT_DIST_DIR) {
    config.clientDistDir = env.CLIENT_DIST_DIR;
  }

  return config;
}
