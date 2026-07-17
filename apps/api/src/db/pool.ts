import { Pool } from 'pg';
import { getPgConnectionString, getPgSslConfig } from './ssl';

export interface CreateDatabasePoolOptions {
  databaseUrl: string;
  maxConnections: number;
}

export function createDatabasePool(options: CreateDatabasePoolOptions): Pool {
  return new Pool({
    connectionString: getPgConnectionString(options.databaseUrl),
    max: options.maxConnections,
    ssl: getPgSslConfig(options.databaseUrl),
  });
}
