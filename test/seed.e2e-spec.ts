import request from 'supertest';
import { SeedService } from '../src/database/seed.service.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Seed data (e2e)', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    await ctx.app.get(SeedService).run();
  });

  afterAll(() => ctx.close());

  const http = () => request(ctx.app.getHttpServer());
  const ids = (body: { id: number }[]) => body.map((book) => book.id);

  it('is idempotent', async () => {
    await ctx.app.get(SeedService).run();

    const users = await ctx.dataSource.query('SELECT COUNT(*) AS n FROM users');
    const books = await ctx.dataSource.query('SELECT COUNT(*) AS n FROM books');
    expect(users[0].n).toBe(3);
    expect(books[0].n).toBe(5);
  });

  it('matches the documented public catalog expectations', async () => {
    expect(ids((await http().get('/books').expect(200)).body)).toEqual([
      1, 2, 5,
    ]);
    expect(
      ids((await http().get('/books?author=lohgarra').expect(200)).body),
    ).toEqual([1, 2]);
    expect(
      ids((await http().get('/books?search=wookie').expect(200)).body),
    ).toEqual([2]);
  });

  it.each([
    ['lohgarra', 'rwaaaaawr'],
    ['chewbacca', 'rrwwwgggh'],
    ['darth_vader', 'iwanttopublish'],
  ])('lets %s log in', async (username, password) => {
    await http().post('/auth/token').send({ username, password }).expect(200);
  });

  it('shows lohgarra her own books without the deleted one', async () => {
    const login = await http()
      .post('/auth/token')
      .send({ username: 'lohgarra', password: 'rwaaaaawr' })
      .expect(200);

    const response = await http()
      .get('/me/books')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(ids(response.body)).toEqual([1, 2, 3]);
  });
});
