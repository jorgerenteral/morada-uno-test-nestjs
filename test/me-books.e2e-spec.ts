import request from 'supertest';
import { User } from '../src/users/user.entity.js';
import { bearer } from './support/auth.js';
import { createBook, createUser } from './support/factories.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Author books (e2e)', () => {
  let ctx: TestApp;
  let author: User;
  let headers: { Authorization: string };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    author = await createUser(ctx, {
      username: 'lohgarra',
      authorPseudonym: 'Lohgarra',
    });
    headers = await bearer(ctx, author);
  });

  afterAll(() => ctx.close());

  const http = () => request(ctx.app.getHttpServer());

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      const response = await http().get('/me/books').expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('rejects malformed tokens', async () => {
      await http()
        .get('/me/books')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    });

    it('rejects tokens that are not bearer tokens', async () => {
      await http()
        .get('/me/books')
        .set(
          'Authorization',
          headers.Authorization.replace('Bearer ', 'Basic '),
        )
        .expect(401);
    });

    it('rejects tokens of users that no longer exist', async () => {
      const ghost = Object.assign(new User(), { id: 999 });

      await http()
        .get('/me/books')
        .set(await bearer(ctx, ghost))
        .expect(401);
    });

    it('protects every /me/books route', async () => {
      await http().post('/me/books').send({}).expect(401);
    });
  });

  describe('GET /me/books', () => {
    it('lists own drafts and published books but not deleted or foreign ones', async () => {
      const published = await createBook(ctx, author, { published: true });
      const draft = await createBook(ctx, author);
      await createBook(ctx, author, { published: true, deletedAt: new Date() });
      await createBook(ctx, await createUser(ctx), { published: true });

      const response = await http().get('/me/books').set(headers).expect(200);

      expect(response.body.map((book: { id: number }) => book.id)).toEqual([
        published.id,
        draft.id,
      ]);
      expect(response.body[1]).toMatchObject({
        published: false,
        deleted_at: null,
        author_pseudonym: 'Lohgarra',
      });
    });
  });

  describe('POST /me/books', () => {
    const payload = {
      title: 'Adventures on Kashyyyk',
      description: 'A thrilling tale of...',
      price: '9.99',
      cover_image_url: 'https://example.com/cover.jpg',
    };

    it('creates a draft owned by the authenticated user', async () => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        ...payload,
        author_pseudonym: 'Lohgarra',
        published: false,
        deleted_at: null,
      });
      expect(response.body.id).toBeGreaterThan(0);

      const mine = await http().get('/me/books').set(headers).expect(200);
      expect(mine.body).toHaveLength(1);
      await http().get(`/books/${response.body.id}`).expect(404);
    });

    it('accepts books without a cover and numeric prices', async () => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send({ title: 'No cover', description: 'Plain', price: 5 })
        .expect(201);

      expect(response.body.cover_image_url).toBeNull();
      expect(response.body.price).toBe('5.00');
    });

    it('returns a clear 400 when the title is missing', async () => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send({ description: 'x', price: '1.00' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: 'title is required',
        details: { field: 'title', code: 'required' },
      });
    });

    it.each([
      ['description', { title: 'x', price: '1.00' }],
      ['price', { title: 'x', description: 'y' }],
    ])('returns 400 when %s is missing', async (field, body) => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send(body)
        .expect(400);

      expect(response.body.details).toMatchObject({ field, code: 'required' });
    });

    it.each([
      ['price', { price: 'abc' }],
      ['price', { price: '-1' }],
      ['price', { price: '1.999' }],
      ['cover_image_url', { price: '1', cover_image_url: 'not a url' }],
    ])('rejects an invalid %s', async (field, extra) => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send({ title: 'x', description: 'y', ...extra })
        .expect(400);

      expect(response.body.error).toBe('validation_error');
      expect(response.body.details.field).toBe(field);
    });

    it('rejects publishing on create', async () => {
      const response = await http()
        .post('/me/books')
        .set(headers)
        .send({ ...payload, published: true })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: 'Cannot publish on create. Use PATCH to publish.',
        details: { field: 'published' },
      });
      const mine = await http().get('/me/books').set(headers).expect(200);
      expect(mine.body).toEqual([]);
    });
  });
});
