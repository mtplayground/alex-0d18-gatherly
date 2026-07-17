export interface AppConfig {
  host: string;
  port: number;
  nodeEnv: string;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    host: env.HOST ?? '0.0.0.0',
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV ?? 'development',
  };

  if (env.CLIENT_DIST_DIR) {
    config.clientDistDir = env.CLIENT_DIST_DIR;
  }

  return config;
}
