import { createApp } from './app.js';
import { apiConfig } from './config.js';

const server = createApp({ demoMode: apiConfig.demoMode }).listen(apiConfig.port, apiConfig.host, () => {
  console.log(`Mochi API listening on http://${apiConfig.host}:${apiConfig.port}`);
});
server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close());
}
