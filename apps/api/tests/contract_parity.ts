/** Differential test only: Node runs the frozen TS reference, never the backend. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import * as contracts from '../../../packages/contracts/src/index.ts';
import { applyAction, getAppState, emptyStoredState, DomainError, type Action } from '../../../packages/domain/src/index.ts';

const directory = await mkdtemp(join(tmpdir(), 'mochi-parity-'));
const reservation = createServer();
await new Promise<void>((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const address = reservation.address();
if (!address || typeof address === 'string') throw Error('No test port');
const port = address.port;
await new Promise<void>((resolve, reject) => reservation.close((e) => e ? reject(e) : resolve()));
const server = spawn(fileURLToPath(new URL('../build/mochi-api', import.meta.url)), [], {
  env: { ...process.env, PORT: String(port), API_HOST: '127.0.0.1', DB_PATH: join(directory, 'state.sqlite3'),
    DEMO_MODE: 'true', ENABLE_DEVICE_API: 'false', DEMO_TIME_ZONE: 'America/Toronto' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', b => { logs += b; }); server.stderr.on('data', b => { logs += b; });
const base = `http://127.0.0.1:${port}`;
let stored = emptyStoredState();
let tested = 0;
const routes = {
  onboard: ['POST', '/api/onboarding', contracts.onboardingSchema], letter: ['PUT', '/api/letter', contracts.letterInputSchema],
  decision: ['POST', '/api/decisions', contracts.decisionSchema], savings: ['POST', '/api/savings', contracts.savingsSchema],
  feed: ['POST', '/api/feed', contracts.feedSchema], quest: ['POST', '/api/quests/complete', contracts.questSchema],
  seed: ['POST', '/api/demo/seed', contracts.demoSeedSchema], reset: ['POST', '/api/demo/reset', contracts.demoResetSchema],
} as const;
async function compare(type: Action['type'], raw: unknown) {
  const [method, path, schema] = routes[type];
  const now = new Date();
  let next = stored;
  let expectedStatus = 200;
  let expectedCode = '';
  const parsed = schema.safeParse(raw);
  if (!parsed.success) { expectedStatus = 400; expectedCode = 'INVALID_REQUEST'; }
  else {
    try { next = applyAction(stored, { type, ...(type === 'reset' ? {} : { input: parsed.data }) } as Action, now); }
    catch (e) {
      if (!(e instanceof DomainError)) throw e;
      expectedStatus = e.status; expectedCode = e.code;
    }
  }
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, `${type}: ${JSON.stringify(raw)}`);
  if (expectedStatus === 200) { assert.deepEqual(body, getAppState(next, now), type); stored = next; }
  else assert.equal(body.error.code, expectedCode, type);
  const current = await (await fetch(base + '/api/state')).json();
  assert.deepEqual(current, getAppState(stored, now), `${type} atomic state`);
  tested++;
}
try {
  let started = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try { if ((await fetch(base + '/health')).ok) { started = true; break; } } catch {}
    await delay(25);
  }
  assert.ok(started, logs);
  const onboarding = { petName: '\u3000Mochi\u00a0', goalTitle: 'Emergency fund', goalTarget: 200,
    letter: { vision: '  My future.\n', why: '', reminder: 'Small steps count.' } };
  await compare('savings', { requestId: randomUUID(), amount: 1 });
  await compare('onboard', onboarding); await compare('onboard', onboarding);
  const feed = { requestId: randomUUID(), petId: 'mochi-01' };
  await compare('feed', feed);
  const skip = { requestId: randomUUID(), itemName: ' Hoodie ', amount: 60, decision: 'skip' };
  await compare('decision', skip);
  await compare('savings', { requestId: randomUUID(), amount: 50 });
  await compare('feed', feed); await compare('feed', feed); await compare('decision', skip);
  const quest = { requestId: randomUUID(), questId: 'daily-check-in' };
  await compare('quest', quest); await compare('seed', { xp: 100 });
  await compare('quest', quest); await compare('quest', { ...quest, requestId: randomUUID() });
  for (const confirmedSaved of [0, 49.99, 50, 99.99, 100, 199.99, 200, 500])
    await compare('seed', { confirmedSaved });
  await compare('seed', { xp: 250 });
  await compare('letter', { letter: { vision: 'Exact whitespace\n  ', why: 'New why', reminder: '' } });
  for (const amount of [null, true, '5', -1, 0, .001, 10.999, 1000000000.01])
    await compare('savings', { requestId: randomUUID(), amount });
  await compare('savings', { requestId: 'bad', amount: 50 });
  await compare('savings', { requestId: randomUUID(), amount: 50, extra: 1 });
  let random = 123456;
  for (let i = 0; i < 80; ++i) {
    random = (random * 1664525 + 1013904223) >>> 0;
    const amount = [.01, .1, .29, 1.01, 60.01, 101, 1000000000][random % 7];
    if (i % 3 === 0) await compare('savings', { requestId: randomUUID(), amount });
    else await compare('decision', { requestId: randomUUID(), itemName: 'Sample', amount, decision: i % 5 ? 'skip' : 'buy' });
  }
  await compare('reset', {}); await compare('onboard', onboarding);
  console.log(`C++/frozen TypeScript reference parity: ${tested} transitions passed`);
} finally {
  const exited = new Promise<void>(resolve => server.once('exit', () => resolve()));
  if (server.exitCode === null) { server.kill('SIGTERM'); await exited; }
  await rm(directory, { recursive: true, force: true });
}
