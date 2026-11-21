import { createApp } from './app.js';
import { apiConfig } from './config.js';
import { createFileRepository } from './persistence/repository.js';

const repository = await createFileRepository(apiConfig.dataFile);
const server = createApp({ demoMode: apiConfig.demoMode, repository, timeZone: apiConfig.timeZone }).listen(apiConfig.port, apiConfig.host, () => {
  console.log(`Mochi API listening on http://${apiConfig.host}:${apiConfig.port}`);
});
server.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => server.close());
}
