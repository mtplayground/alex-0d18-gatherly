import type { PoolConfig } from 'pg';

type PgSslConfig = PoolConfig['ssl'];

export function getPgSslConfig(databaseUrl: string): PgSslConfig {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('sslmode');

  if (!sslMode || sslMode === 'disable') {
    return false;
  }

  if (sslMode === 'require' || sslMode === 'prefer') {
    return {
      rejectUnauthorized: false,
    };
  }

  return true;
}

export function getPgConnectionString(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');

  return url.toString();
}
