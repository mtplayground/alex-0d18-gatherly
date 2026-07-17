export interface DatabaseConfig {
  url: string;
  maxConnections: number;
}

export interface ObjectStorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
}

export interface AuthConfig {
  url: string;
  appToken: string;
  jwksUrl: string;
}

export interface EmailConfig {
  url: string;
  appToken: string;
}

export interface AppConfig {
  host: string;
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  objectStorage: ObjectStorageConfig;
  auth?: AuthConfig;
  email?: EmailConfig;
  selfUrl: string;
  allowedCorsOrigin?: string;
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

function optionalEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  return value ? value : undefined;
}

function requireUrlEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = requireEnv(env, name);

  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
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

function parseBooleanEnv(env: NodeJS.ProcessEnv, name: string): boolean {
  const value = requireEnv(env, name).toLowerCase();

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${name} must be true or false`);
}

function loadDatabaseConfig(env: NodeJS.ProcessEnv): DatabaseConfig {
  return {
    url: requireEnv(env, 'DATABASE_URL'),
    maxConnections: parsePositiveInteger(
      env.DATABASE_MAX_CONNECTIONS,
      5,
      'DATABASE_MAX_CONNECTIONS',
    ),
  };
}

function loadObjectStorageConfig(env: NodeJS.ProcessEnv): ObjectStorageConfig {
  const prefix = requireEnv(env, 'OBJECT_STORAGE_PREFIX');
  if (!prefix.endsWith('/')) {
    throw new Error('OBJECT_STORAGE_PREFIX must end with /');
  }

  return {
    accessKeyId: requireEnv(env, 'OBJECT_STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv(env, 'OBJECT_STORAGE_SECRET_ACCESS_KEY'),
    bucket: requireEnv(env, 'OBJECT_STORAGE_BUCKET'),
    prefix,
    endpoint: requireUrlEnv(env, 'OBJECT_STORAGE_ENDPOINT'),
    region: requireEnv(env, 'OBJECT_STORAGE_REGION'),
    forcePathStyle: parseBooleanEnv(env, 'OBJECT_STORAGE_FORCE_PATH_STYLE'),
  };
}

function loadAuthConfig(env: NodeJS.ProcessEnv): AuthConfig | undefined {
  const url = optionalEnv(env, 'MCTAI_AUTH_URL');
  const appToken = optionalEnv(env, 'MCTAI_AUTH_APP_TOKEN');
  const jwksUrl = optionalEnv(env, 'MCTAI_AUTH_JWKS_URL');

  if (!url && !appToken && !jwksUrl) {
    return undefined;
  }

  if (!url || !appToken || !jwksUrl) {
    throw new Error(
      'MCTAI_AUTH_URL, MCTAI_AUTH_APP_TOKEN, and MCTAI_AUTH_JWKS_URL must be set together',
    );
  }

  try {
    new URL(url);
  } catch {
    throw new Error('MCTAI_AUTH_URL must be a valid URL');
  }

  try {
    new URL(jwksUrl);
  } catch {
    throw new Error('MCTAI_AUTH_JWKS_URL must be a valid URL');
  }

  return {
    url,
    appToken,
    jwksUrl,
  };
}

function loadEmailConfig(env: NodeJS.ProcessEnv): EmailConfig | undefined {
  const url = optionalEnv(env, 'MCTAI_EMAIL_URL');
  const appToken = optionalEnv(env, 'MCTAI_EMAIL_APP_TOKEN');

  if (!url && !appToken) {
    return undefined;
  }

  if (!url || !appToken) {
    throw new Error('MCTAI_EMAIL_URL and MCTAI_EMAIL_APP_TOKEN must be set together');
  }

  try {
    new URL(url);
  } catch {
    throw new Error('MCTAI_EMAIL_URL must be a valid URL');
  }

  return {
    url,
    appToken,
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = parsePort(env.PORT);
  const config: AppConfig = {
    host: env.HOST ?? '0.0.0.0',
    port,
    nodeEnv: env.NODE_ENV ?? 'development',
    database: loadDatabaseConfig(env),
    objectStorage: loadObjectStorageConfig(env),
    selfUrl: optionalEnv(env, 'SELF_URL') ?? `http://localhost:${port}`,
  };

  const auth = loadAuthConfig(env);
  if (auth) {
    config.auth = auth;
  }

  try {
    new URL(config.selfUrl);
  } catch {
    throw new Error('SELF_URL must be a valid URL when set');
  }

  const email = loadEmailConfig(env);
  if (email) {
    config.email = email;
  }

  const allowedCorsOrigin = optionalEnv(env, 'ALLOWED_CORS_ORIGIN');
  if (allowedCorsOrigin) {
    try {
      new URL(allowedCorsOrigin);
    } catch {
      throw new Error('ALLOWED_CORS_ORIGIN must be a valid URL');
    }

    config.allowedCorsOrigin = allowedCorsOrigin;
  }

  if (env.CLIENT_DIST_DIR) {
    config.clientDistDir = env.CLIENT_DIST_DIR;
  }

  return config;
}
