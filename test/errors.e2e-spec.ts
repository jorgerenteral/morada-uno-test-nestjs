import request from 'supertest';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Error handling (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(() => ctx.close());

  it('renders unknown routes with the error envelope', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/unknown')
      .expect(404);

    expect(response.body).toEqual({
      error: 'not_found',
      message: 'Resource not found',
    });
  });

  it('renders malformed JSON bodies as bad requests', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/unknown')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400);

    expect(response.body.error).toBe('bad_request');
    expect(typeof response.body.message).toBe('string');
  });
});
