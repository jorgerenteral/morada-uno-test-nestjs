import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('POST /auth/token (e2e)', () => {
  let ctx: TestApp;
  let lohgarra: User;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    lohgarra = await ctx.app.get(UsersService).create({
      username: 'lohgarra',
      password: 'rwaaaaawr',
      authorPseudonym: 'Lohgarra',
    });
  });

  afterAll(() => ctx.close());

  const login = (body: object) =>
    request(ctx.app.getHttpServer()).post('/auth/token').send(body);

  it('returns a bearer jwt for valid credentials', async () => {
    const response = await login({
      username: 'lohgarra',
      password: 'rwaaaaawr',
    }).expect(200);

    expect(response.body.token_type).toBe('bearer');

    const claims = await ctx.app
      .get(JwtService)
      .verifyAsync<{ sub: string; exp: number }>(response.body.access_token);
    expect(claims.sub).toBe(String(lohgarra.id));
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('returns 401 for a wrong password', async () => {
    const response = await login({
      username: 'lohgarra',
      password: 'nope',
    }).expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  it('returns 401 for an unknown user', async () => {
    const response = await login({
      username: 'ghost',
      password: 'whatever',
    }).expect(401);

    expect(response.body.error).toBe('unauthorized');
  });

  it('returns 400 when a field is missing', async () => {
    const response = await login({ username: 'lohgarra' }).expect(400);

    expect(response.body).toMatchObject({
      error: 'validation_error',
      details: { field: 'password', code: 'required' },
    });
  });
});
