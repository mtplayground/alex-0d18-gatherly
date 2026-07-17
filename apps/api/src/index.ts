import { createApp } from './app';
import { loadConfig } from './config';

async function main() {
  const config = loadConfig();
  const app = createApp(config.clientDistDir ? { clientDistDir: config.clientDistDir } : undefined);

  const server = app.listen(config.port, config.host, () => {
    console.log(`API listening on http://${config.host}:${config.port}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    console.log(`Received ${signal}; shutting down`);
    server.close((err: Error | undefined) => {
      if (err) {
        console.error('Error while closing server', err);
        process.exitCode = 1;
      }
      process.exit();
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
