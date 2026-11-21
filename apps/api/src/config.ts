import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

// Both entrypoints live at apps/api/{src,dist} and use the same workspace root.
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));
config({ path: path.join(workspaceRoot, '.env'), quiet: true });

const env = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  DEMO_MODE: z.enum(['true', 'false']).default('true'),
  DATA_FILE: z.string().min(1).default('./data/state.json'),
}).parse(process.env);

export const apiConfig = {
  port: env.PORT,
  host: env.API_HOST,
  demoMode: env.DEMO_MODE === 'true',
  dataFile: path.resolve(workspaceRoot, env.DATA_FILE),
};
