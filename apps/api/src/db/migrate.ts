import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { getPgConnectionString, getPgSslConfig } from './ssl';

interface MigrationFile {
  version: string;
  name: string;
  path: string;
}

interface MigrationSections {
  up: string;
  down: string;
}

const migrationsDir = path.resolve(__dirname, '../../../..', 'migrations');

function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL env not set');
  }

  return databaseUrl;
}

async function listMigrations(): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => {
      const match = entry.name.match(/^(\d+)_(.+)\.sql$/);
      const version = match?.[1];
      const name = match?.[2];
      if (!version || !name) {
        throw new Error(`Invalid migration filename: ${entry.name}`);
      }

      return {
        version,
        name,
        path: path.join(migrationsDir, entry.name),
      };
    })
    .sort((a, b) => a.version.localeCompare(b.version));
}

function parseMigrationSections(source: string, filePath: string): MigrationSections {
  const upMarker = '-- migrate:up';
  const downMarker = '-- migrate:down';
  const upStart = source.indexOf(upMarker);
  const downStart = source.indexOf(downMarker);

  if (upStart === -1 || downStart === -1 || downStart < upStart) {
    throw new Error(`Migration ${filePath} must contain ordered up and down sections`);
  }

  return {
    up: source.slice(upStart + upMarker.length, downStart).trim(),
    down: source.slice(downStart + downMarker.length).trim(),
  };
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedVersions(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );

  return new Set(result.rows.map((row) => row.version));
}

async function withMigrationLock<T>(client: PoolClient, fn: () => Promise<T>): Promise<T> {
  await client.query(
    "SELECT pg_advisory_lock(hashtext(current_database() || ':schema_migrations'))",
  );
  try {
    return await fn();
  } finally {
    await client.query(
      "SELECT pg_advisory_unlock(hashtext(current_database() || ':schema_migrations'))",
    );
  }
}

async function runUp(client: PoolClient, migrations: MigrationFile[]): Promise<void> {
  const applied = await appliedVersions(client);

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    const sections = parseMigrationSections(await readFile(migration.path, 'utf8'), migration.path);

    await client.query('BEGIN');
    try {
      if (sections.up) {
        await client.query(sections.up);
      }
      await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [
        migration.version,
        migration.name,
      ]);
      await client.query('COMMIT');
      console.log(`Applied migration ${migration.version}_${migration.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
}

async function runDown(client: PoolClient, migrations: MigrationFile[]): Promise<void> {
  const result = await client.query<{ version: string; name: string }>(
    'SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1',
  );
  const latest = result.rows[0];

  if (!latest) {
    console.log('No migrations to roll back');
    return;
  }

  const migration = migrations.find((candidate) => candidate.version === latest.version);
  if (!migration) {
    throw new Error(`Applied migration file not found for version ${latest.version}`);
  }

  const sections = parseMigrationSections(await readFile(migration.path, 'utf8'), migration.path);

  await client.query('BEGIN');
  try {
    if (sections.down) {
      await client.query(sections.down);
    }
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [migration.version]);
    await client.query('COMMIT');
    console.log(`Rolled back migration ${migration.version}_${migration.name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main(): Promise<void> {
  const direction = process.argv[2];
  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Usage: tsx src/db/migrate.ts <up|down>');
  }

  const databaseUrl = requireDatabaseUrl();
  const pool = new Pool({
    connectionString: getPgConnectionString(databaseUrl),
    max: 1,
    ssl: getPgSslConfig(databaseUrl),
  });

  try {
    const client = await pool.connect();
    try {
      const migrations = await listMigrations();
      await withMigrationLock(client, async () => {
        await ensureMigrationsTable(client);
        if (direction === 'up') {
          await runUp(client, migrations);
        } else {
          await runDown(client, migrations);
        }
      });
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('Migration failed', err);
  process.exit(1);
});
