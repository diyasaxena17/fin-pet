/** End-to-end differential coverage: native HTTP versus the actual FE mock. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { DomainError, localDate } from '@mochi/domain';
import { type AddendumMochiApi } from '@mochi/contracts';
import { createMockApi } from '../../web/src/lib/mockApi.ts';

const directory = await mkdtemp(join(tmpdir(), 'mochi-addendum-parity-'));
const reservation = createServer();
await new Promise<void>((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const address = reservation.address();
assert.ok(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
const server = spawn(fileURLToPath(new URL('../build/mochi-api', import.meta.url)), [], {
  env: { ...process.env, PORT: String(port), API_HOST: '127.0.0.1', DB_PATH: join(directory, 'state.sqlite3'),
    DEMO_MODE: 'true', ENABLE_DEVICE_API: 'true', DEMO_TIME_ZONE: 'America/Toronto' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', (b) => { logs += b; }); server.stderr.on('data', (b) => { logs += b; });
const base = `http://127.0.0.1:${port}`;
const mock = createMockApi();
let tested = 0;
function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => {
    if (key === 'reflectedAt') {
      assert.equal(typeof child, 'string');
      assert.ok(Math.abs(Date.now() - Date.parse(child as string)) < 10_000, 'Reflection timestamp is current');
      return [key, '<observed timestamp>'];
    }
    return [key, normalized(child)];
  }));
  return value;
}
async function compare(method: string, path: string, operation: keyof AddendumMochiApi, args: unknown[] = [], body?: unknown) {
  let expected: unknown, status = 200, code = '';
  try { expected = await (mock[operation] as (...args: unknown[]) => Promise<unknown>)(...args); }
  catch (error) {
    if (error instanceof DomainError) { status = error.status; code = error.code; }
    else if (error instanceof z.ZodError) { status = 400; code = 'INVALID_REQUEST'; }
    else throw error;
  }
  const response = await fetch(base + path, { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const actual = await response.json();
  assert.equal(response.status, status, `${operation}: ${JSON.stringify(body)} ${JSON.stringify(actual)}`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  if (status === 200) assert.deepEqual(normalized(actual), normalized(expected), operation);
  else assert.equal(actual.error.code, code, operation);
  const liveState = await (await fetch(base + '/api/state')).json();
  assert.deepEqual(normalized(liveState), normalized(await mock.getState()), `${operation}: atomic state`);
  tested++;
  return actual;
}
const mutation = (method: string, path: string, operation: keyof AddendumMochiApi, body: unknown) => compare(method, path, operation, [body], body);
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(logs);
    try { if ((await fetch(base + '/health')).ok) { ready = true; break; } } catch {}
    await delay(25);
  }
  assert.ok(ready, logs);
  const month = localDate(new Date()).slice(0, 7);
  await compare('GET', '/api/state', 'getState');
  for (const [path, operation] of [['/api/insights', 'getInsights'], ['/api/lessons', 'getLessons'], ['/api/reflections/due', 'getDueReflections'], ['/api/reports/today', 'getDailyReport']] as const)
    await compare('GET', path, operation);
  await mutation('POST', '/api/onboarding', 'onboard', { petName: 'Mochi', goalTitle: 'Fund', goalTarget: 200, letter: { vision: '  Original\n', why: '', reminder: '' } });
  await mutation('PUT', '/api/preferences', 'updatePreferences', { voice: 'calm' });
  await mutation('PUT', '/api/preferences', 'updatePreferences', { voice: 'invalid' });
  await mutation('PUT', '/api/preferences', 'updatePreferences', { petName: '  Clover  ' });
  await mutation('PUT', '/api/preferences', 'updatePreferences', { voice: 'cute' });
  await mutation('PUT', '/api/preferences', 'updatePreferences', { petName: 'Maple', voice: 'calm' });
  for (const body of [{}, { petName: ' ' }, { petName: 'x'.repeat(201) }, { petName: '🐿'.repeat(101) }, { petName: null }, { petName: 'Clover', unknown: true }])
    await mutation('PUT', '/api/preferences', 'updatePreferences', body);

  await compare('GET', `/api/budgets?month=${month}`, 'getBudgets', [month]);
  await mutation('PUT', '/api/budgets', 'updateBudgets', { month, monthlyLimit: 500, dailyLimit: 25, categoryLimits: { food: 100 } });
  await mutation('PUT', '/api/budgets', 'updateBudgets', { month, monthlyLimit: 0 });
  const transaction = { requestId: randomUUID(), name: ' Takeout ', amount: .29, category: 'food', occurredAt: new Date(Date.now() - 2 * 86_400_000).toISOString() };
  for (const changed of [{ amount: .001 }, { occurredAt: '2026-02-30T12:00:00Z' }, { occurredAt: '2099-01-01T00:00:00Z' }, { source: 'bank-connected' }, { category: 'unknown' }])
    await mutation('POST', '/api/transactions', 'recordTransaction', { ...transaction, ...changed });
  const first = await mutation('POST', '/api/transactions', 'recordTransaction', transaction);
  await mutation('POST', '/api/transactions', 'recordTransaction', transaction);
  await mutation('POST', '/api/transactions', 'recordTransaction', { ...transaction, amount: 10 });
  await mutation('POST', '/api/savings', 'recordSavings', { requestId: transaction.requestId, amount: 50 });
  for (let i = 0; i < 2; i++) await mutation('POST', '/api/transactions', 'recordTransaction', { ...transaction, requestId: randomUUID() });
  await compare('GET', `/api/transactions?month=${month}`, 'getTransactions', [month]);
  await compare('GET', '/api/insights', 'getInsights');
  await compare('GET', '/api/reflections/due', 'getDueReflections');
  const reflection = { requestId: randomUUID(), transactionId: first.transaction.id, verdict: 'unsure' };
  await mutation('POST', '/api/reflections', 'reflect', reflection);
  await mutation('POST', '/api/reflections', 'reflect', reflection);
  await mutation('POST', '/api/reflections', 'reflect', { ...reflection, requestId: randomUUID(), verdict: 'worth_it' });
  await compare('GET', '/api/reflections/due', 'getDueReflections');
  await compare('GET', '/api/lessons', 'getLessons');
  const answer = { requestId: randomUUID(), lessonId: 'potential-vs-confirmed', selectedOptionId: 'skip' };
  await mutation('POST', '/api/lessons/answer', 'answerLesson', answer);
  await mutation('POST', '/api/lessons/answer', 'answerLesson', { ...answer, selectedOptionId: 'save' });
  answer.requestId = randomUUID(); answer.selectedOptionId = 'save';
  await mutation('POST', '/api/lessons/answer', 'answerLesson', answer);
  await mutation('POST', '/api/lessons/answer', 'answerLesson', answer);
  await mutation('POST', '/api/lessons/answer', 'answerLesson', { ...answer, requestId: randomUUID() });
  await compare('GET', '/api/lessons', 'getLessons');
  await compare('GET', '/api/reports/today', 'getDailyReport');
  const checkIn = { requestId: randomUUID() };
  await mutation('POST', '/api/check-ins', 'checkIn', checkIn);
  await mutation('POST', '/api/demo/seed', 'demoSeed', { xp: 100 });
  await mutation('POST', '/api/check-ins', 'checkIn', checkIn);
  await mutation('POST', '/api/quests/complete', 'completeQuest', { ...checkIn, questId: 'daily-check-in' });
  await mutation('POST', '/api/check-ins', 'checkIn', checkIn);
  await mutation('POST', '/api/check-ins', 'checkIn', { requestId: randomUUID() });
  const quest = { requestId: randomUUID(), questId: 'daily-check-in' };
  await mutation('POST', '/api/quests/complete', 'completeQuest', quest);
  await mutation('POST', '/api/check-ins', 'checkIn', { requestId: quest.requestId });
  await mutation('POST', '/api/savings', 'recordSavings', { requestId: quest.requestId, amount: 50 });
  await compare('GET', '/api/reports/today', 'getDailyReport');
  await mutation('PUT', '/api/budgets', 'updateBudgets', { month, monthlyLimit: 100 });
  await compare('GET', '/api/reports/today', 'getDailyReport');
  // Integration checks: both native backend and actual FE mock must apply v2 rules.
  for (let i = 0; i < 3; i++) await mutation('POST', '/api/transactions', 'recordTransaction', {
    requestId: randomUUID(), name: `Cluster sample ${i}`, amount: i + 1,
    category: i === 1 ? 'entertainment' : 'shopping',
    occurredAt: new Date(Date.now() - (3 - i / 2) * 3_600_000).toISOString(),
  });
  await compare('GET', '/api/insights', 'getInsights');
  const notDue = await mutation('POST', '/api/transactions', 'recordTransaction', {
    requestId: randomUUID(), name: '36-hour review', amount: 1, category: 'food',
    occurredAt: new Date(Date.now() - 36 * 3_600_000).toISOString(),
  });
  await mutation('POST', '/api/reflections', 'reflect', {
    requestId: randomUUID(), transactionId: notDue.transaction.id, verdict: 'worth_it',
  });
  await compare('GET', '/api/reflections/due', 'getDueReflections');
  await mutation('POST', '/api/demo/reset', 'demoReset', {});
  console.log(`C++/FE mock addendum parity: ${tested} requests passed`);
} finally {
  if (server.exitCode === null) {
    const exited = new Promise<void>((resolve) => server.once('exit', () => resolve()));
    server.kill('SIGTERM'); await exited;
  }
  await rm(directory, { recursive: true, force: true });
}
