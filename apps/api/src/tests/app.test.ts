import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { createFileRepository, createMemoryRepository } from '../persistence/repository';

const onboarding = { petName: 'Mochi', goalTitle: 'Emergency fund', goalTarget: 200,
  goalDate: '2027-01-01', letter: { vision: 'My future', why: 'My reasons', reminder: 'Small steps count.' } };
const initializedApp = async () => {
  const app = createApp({ demoMode: true });
  await request(app).post('/api/onboarding').send(onboarding).expect(200);
  return app;
};

describe('standalone API contract', () => {
  it('serves health and minimal state before onboarding', async () => {
    const app = createApp();
    await request(app).get('/health').expect(200, { ok: true });
    await request(app).get('/api/state').expect(200, { initialized: false });
    const response = await request(app).post('/api/savings').send({ requestId: randomUUID(), amount: 50 }).expect(404);
    expect(response.body.error.code).toBe('NOT_INITIALIZED');
  });
  it('implements the complete savings and feeding flow without hardware', async () => {
    const app = await initializedApp();
    const skip = await request(app).post('/api/decisions').send({ requestId: randomUUID(), itemName: 'Hoodie', amount: 60, decision: 'skip' }).expect(200);
    expect(skip.body.wallet).toMatchObject({ coins: 60, xp: 20, level: 1 });
    expect(skip.body.goal).toMatchObject({ potentialSavings: 60, confirmedSaved: 0 });
    const saved = await request(app).post('/api/savings').send({ requestId: randomUUID(), amount: 50 }).expect(200);
    expect(saved.body.wallet.xp).toBe(50);
    expect(saved.body.goal.progressPercent).toBe(25);
    expect(saved.body.letter).toMatchObject({ vision: 'My future', revealedSections: 1 });
    const fed = await request(app).post('/api/feed').send({ requestId: randomUUID(), petId: 'mochi-01' }).expect(200);
    expect(fed.body.wallet).toMatchObject({ coins: 40, xp: 50 });
    expect(fed.body.pet).toMatchObject({ hunger: 80, mood: 'happy' });
    expect(fed.body).not.toHaveProperty('device');
    expect(fed.body).not.toHaveProperty('state');
    expect(fed.headers['cache-control']).toBe('no-store');
  });
  it('deduplicates concurrent retries and returns current state', async () => {
    const app = await initializedApp();
    const decision = { requestId: randomUUID(), itemName: 'Hoodie', amount: 60, decision: 'skip' };
    await Promise.all(Array.from({ length: 5 }, () => request(app).post('/api/decisions').send(decision).expect(200)));
    const savings = { requestId: randomUUID(), amount: 50 };
    await request(app).post('/api/savings').send(savings).expect(200);
    await request(app).post('/api/savings').send(savings).expect(200);
    const feed = { requestId: randomUUID(), petId: 'mochi-01' };
    await Promise.all([request(app).post('/api/feed').send(feed).expect(200), request(app).post('/api/feed').send(feed).expect(200)]);
    const retry = await request(app).post('/api/decisions').send(decision).expect(200);
    expect(retry.body.wallet).toMatchObject({ coins: 40, xp: 50 });
    expect(retry.body.goal.confirmedSaved).toBe(50);
    expect(retry.body.pet.hunger).toBe(80);
  });
  it('serializes different concurrent actions without losing updates', async () => {
    const app = await initializedApp();
    await Promise.all(Array.from({ length: 10 }, () => request(app).post('/api/savings').send({ requestId: randomUUID(), amount: 0.1 }).expect(200)));
    const result = await request(app).get('/api/state').expect(200);
    expect(result.body.goal.confirmedSaved).toBe(1);
    expect(result.body.wallet).toMatchObject({ xp: 300, level: 3, nextLevelXp: null });
  });
  it('allows full original-letter editing independent of milestone reveals', async () => {
    const app = await initializedApp();
    const letter = { vision: '  Keep my exact words.\nA new line.', why: 'Why', reminder: '' };
    const updated = await request(app).put('/api/letter').send({ letter }).expect(200);
    expect(updated.body.letter).toEqual({ ...letter, revealedSections: 0 });
    await request(app).post('/api/onboarding').send(onboarding).expect(409);
  });
  it('rejects insufficient coins without recording a successful request ID', async () => {
    const app = await initializedApp();
    const input = { requestId: randomUUID(), petId: 'mochi-01' };
    const failed = await request(app).post('/api/feed').send(input).expect(409);
    expect(failed.body.error.code).toBe('INSUFFICIENT_COINS');
    await request(app).post('/api/demo/seed').send({ coins: 20 }).expect(200);
    const retried = await request(app).post('/api/feed').send(input).expect(200);
    expect(retried.body.wallet.coins).toBe(0);
    expect(retried.body.pet.hunger).toBe(80);
  });
  it('gates daily quests, derives unlocks, and prevents same-day duplicate rewards', async () => {
    const app = await initializedApp();
    await request(app).post('/api/quests/complete').send({ requestId: randomUUID(), questId: 'daily-check-in' }).expect(409);
    const level2 = await request(app).post('/api/demo/seed').send({ xp: 100 }).expect(200);
    expect(level2.body.demoSeeded).toBe(true);
    expect(level2.body.unlockedFeatures).toContain('dailyQuest');
    for (let i = 0; i < 2; i++) await request(app).post('/api/quests/complete').send({ requestId: randomUUID(), questId: 'daily-check-in' }).expect(200);
    const state = await request(app).get('/api/state');
    expect(state.body.wallet).toMatchObject({ xp: 120, coins: 10 });
    const level3 = await request(app).post('/api/demo/seed').send({ xp: 250 }).expect(200);
    expect(level3.body.unlockedFeatures).toContain('expandedProjection');
  });
  it('returns 404 for disabled demos, removed device routes, and legacy endpoints', async () => {
    const app = createApp({ demoMode: false });
    for (const endpoint of ['/api/demo/seed', '/api/demo/reset', '/api/device/gesture', '/api/onboard', '/api/pet/feed']) {
      await request(app).post(endpoint).send({}).expect(404);
    }
    await request(app).get('/api/device/state').expect(404);
  });
  it('validates request schemas and malformed JSON before mutating', async () => {
    const app = await initializedApp();
    for (const input of [{ requestId: randomUUID(), amount: -1 }, { requestId: 'bad', amount: 5 }, { requestId: randomUUID(), amount: 0.001 }]) {
      const response = await request(app).post('/api/savings').send(input).expect(400);
      expect(response.body.error.code).toBe('INVALID_REQUEST');
    }
    await request(app).post('/api/onboarding').set('Content-Type', 'application/json').send('{').expect(400);
    expect((await request(app).get('/api/state')).body.wallet.xp).toBe(0);
  });
  it('persists cents, decisions, IDs, and state across repository restarts', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mochi-persistence-'));
    try {
      const file = path.join(directory, 'nested/state.json');
      const app = createApp({ repository: await createFileRepository(file) });
      await request(app).post('/api/onboarding').send(onboarding).expect(200);
      const decision = { requestId: randomUUID(), itemName: 'Hoodie', amount: 60.01, decision: 'skip' };
      await request(app).post('/api/decisions').send(decision).expect(200);
      const savings = { requestId: randomUUID(), amount: 50 };
      await request(app).post('/api/savings').send(savings).expect(200);
      const restarted = createApp({ repository: await createFileRepository(file) });
      const result = await request(restarted).post('/api/savings').send(savings).expect(200);
      expect(result.body.goal).toMatchObject({ confirmedSaved: 50, potentialSavings: 60.01 });
      expect(result.body.wallet).toMatchObject({ coins: 61, xp: 50 });
      const disk = JSON.parse(await readFile(file, 'utf8'));
      expect(disk.account.savedCents).toBe(5000);
      expect(disk.decisions[0].amountCents).toBe(6001);
      expect(disk.processedRequestIds).toEqual([decision.requestId, savings.requestId]);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('rolls back failed saves and keeps the transaction queue usable', async () => {
    let fail = true;
    const repository = createMemoryRepository(undefined, async () => { if (fail) throw new Error('Disk full'); });
    const app = createApp({ repository });
    await request(app).post('/api/onboarding').send(onboarding).expect(500);
    await request(app).get('/api/state').expect(200, { initialized: false });
    fail = false;
    await request(app).post('/api/onboarding').send(onboarding).expect(200);
  });
  it('refuses corrupt persisted files without overwriting them', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mochi-corrupt-'));
    try {
      const file = path.join(directory, 'state.json');
      await writeFile(file, '{corrupt');
      await expect(createFileRepository(file)).rejects.toThrow();
      expect(await readFile(file, 'utf8')).toBe('{corrupt');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('resets demo data and remains uninitialized after a restart', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mochi-reset-'));
    try {
      const file = path.join(directory, 'state.json');
      const app = createApp({ demoMode: true, repository: await createFileRepository(file) });
      await request(app).post('/api/onboarding').send(onboarding).expect(200);
      await request(app).post('/api/demo/reset').send({}).expect(200, { initialized: false });
      await request(createApp({ repository: await createFileRepository(file) })).get('/api/state').expect(200, { initialized: false });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
