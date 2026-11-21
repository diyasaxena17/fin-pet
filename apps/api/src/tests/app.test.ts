import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appStateFixture, type DeviceStateResponse } from '@mochi/contracts';
import { createApp } from '../app';

describe('scaffold API compatibility', () => {
  const app = createApp();
  it('serves laptop and device health checks', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
  });
  it('returns the frozen state fixture', async () => {
    const response = await request(app).get('/api/state').expect(200);
    expect(response.body).toEqual(appStateFixture);
  });
  it('keeps repeated device polling free of reactions and mutations', async () => {
    const expected: DeviceStateResponse = { schemaVersion: 1, petName: 'Mochi', level: 1, mood: 'neutral', reactionSeq: 0 };
    await request(app).get('/api/device/state').expect(200, expected);
    await request(app).get('/api/device/state').expect(200, expected);
  });
  it('marks mutations as unimplemented instead of pretending to persist', async () => {
    const response = await request(app).post('/api/savings').send({ amountCents: 5000 }).expect(501);
    expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
  });
  it('disables demo seeds outside demo mode', async () => {
    await request(createApp({ demoMode: false })).post('/api/demo/seed').send({ level: 2 }).expect(403);
  });
  it('returns the shared error envelope for malformed JSON and missing routes', async () => {
    const invalid = await request(app).post('/api/onboard').set('Content-Type', 'application/json').send('{').expect(400);
    expect(invalid.body.error.code).toBe('INVALID_REQUEST');
    const missing = await request(app).get('/api/missing').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });
});
