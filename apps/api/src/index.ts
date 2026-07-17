import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabasePool } from './db/pool';
import { startEventReminderJob } from './events/eventReminderJob';

async function main() {
  const config = loadConfig();
  const databasePool = createDatabasePool({
    databaseUrl: config.database.url,
    maxConnections: config.database.maxConnections,
  });
  const app = createApp({
    databasePool,
    objectStorage: config.objectStorage,
    selfUrl: config.selfUrl,
    ...(config.auth ? { auth: config.auth } : {}),
    ...(config.email ? { email: config.email } : {}),
    ...(config.clientDistDir ? { clientDistDir: config.clientDistDir } : {}),
  });

  const server = app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`);
  });
  const stopEventReminderJob = startEventReminderJob({
    databasePool,
    selfUrl: config.selfUrl,
    ...(config.email ? { email: config.email } : {}),
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`Received ${signal}; shutting down`);
    stopEventReminderJob();
    server.close((err: Error | undefined) => {
      if (err) {
        console.error('Error while closing server', err);
        process.exitCode = 1;
      }

      databasePool
        .end()
        .catch((poolErr: unknown) => {
          console.error('Error while closing database pool', poolErr);
          process.exitCode = 1;
        })
        .finally(() => {
          process.exit();
        });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
