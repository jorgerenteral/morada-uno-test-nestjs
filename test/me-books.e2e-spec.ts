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

  describe('GET /me/books/:id', () => {
    it('returns an own book, drafts included', async () => {
      const draft = await createBook(ctx, author);

      const response = await http()
        .get(`/me/books/${draft.id}`)
        .set(headers)
        .expect(200);

      expect(response.body).toMatchObject({ id: draft.id, published: false });
    });

    it("returns 403 for someone else's book", async () => {
      const foreign = await createBook(ctx, await createUser(ctx), {
        published: true,
      });

      const response = await http()
        .get(`/me/books/${foreign.id}`)
        .set(headers)
        .expect(403);

      expect(response.body.error).toBe('forbidden');
    });
  });

  describe('PATCH /me/books/:id', () => {
    it('updates fields and can publish the book', async () => {
      const book = await createBook(ctx, author, { title: 'Old', price: '5' });

      const response = await http()
        .patch(`/me/books/${book.id}`)
        .set(headers)
        .send({ title: 'New', price: '12.50', published: true })
        .expect(200);

      expect(response.body).toMatchObject({
        id: book.id,
        title: 'New',
        price: '12.50',
        published: true,
      });
      await http().get(`/books/${book.id}`).expect(200);
    });

    it('can unpublish and clear the cover', async () => {
      const book = await createBook(ctx, author, {
        published: true,
        coverImageUrl: 'https://example.com/c.jpg',
      });

      const response = await http()
        .patch(`/me/books/${book.id}`)
        .set(headers)
        .send({ published: false, cover_image_url: null })
        .expect(200);

      expect(response.body).toMatchObject({
        published: false,
        cover_image_url: null,
      });
      await http().get(`/books/${book.id}`).expect(404);
    });

    it('ignores attempts to change the author', async () => {
      const book = await createBook(ctx, author);
      const other = await createUser(ctx);

      await http()
        .patch(`/me/books/${book.id}`)
        .set(headers)
        .send({ author_id: other.id, authorId: other.id, title: 'Mine' })
        .expect(200);

      const mine = await http().get('/me/books').set(headers).expect(200);
      expect(mine.body.map((b: { id: number }) => b.id)).toEqual([book.id]);
    });

    it.each([
      ['title', { title: '' }],
      ['title', { title: null }],
      ['published', { published: 'maybe' }],
      ['price', { price: '-3' }],
    ])('returns 400 for an invalid %s', async (field, body) => {
      const book = await createBook(ctx, author);

      const response = await http()
        .patch(`/me/books/${book.id}`)
        .set(headers)
        .send(body)
        .expect(400);

      expect(response.body.error).toBe('validation_error');
      expect(response.body.details.field).toBe(field);
    });

    it('requires authentication', async () => {
      const book = await createBook(ctx, author);

      await http()
        .patch(`/me/books/${book.id}`)
        .send({ title: 'x' })
        .expect(401);
    });

    it("returns 403 for someone else's book and changes nothing", async () => {
      const foreign = await createBook(ctx, await createUser(ctx), {
        title: 'Original',
        published: true,
      });

      const response = await http()
        .patch(`/me/books/${foreign.id}`)
        .set(headers)
        .send({ title: 'Hijacked' })
        .expect(403);

      expect(response.body.error).toBe('forbidden');
      const stored = await http().get(`/books/${foreign.id}`).expect(200);
      expect(stored.body.title).toBe('Original');
    });

    it('answers 403 before validating the body of a stranger', async () => {
      const foreign = await createBook(ctx, await createUser(ctx));

      await http()
        .patch(`/me/books/${foreign.id}`)
        .set(headers)
        .send({ title: '' })
        .expect(403);
    });

    it('returns 404 for unknown, malformed and deleted ids', async () => {
      const deleted = await createBook(ctx, author, { deletedAt: new Date() });

      for (const id of [999, 'abc', deleted.id]) {
        const response = await http()
          .patch(`/me/books/${id}`)
          .set(headers)
          .send({ title: 'x' })
          .expect(404);

        expect(response.body.error).toBe('not_found');
      }
    });
  });

  describe('DELETE /me/books/:id', () => {
    it('soft deletes the book and hides it everywhere', async () => {
      const book = await createBook(ctx, author, { published: true });

      const response = await http()
        .delete(`/me/books/${book.id}`)
        .set(headers)
        .expect(204);
      expect(response.text).toBe('');

      await http().get(`/books/${book.id}`).expect(404);
      await http().get(`/me/books/${book.id}`).set(headers).expect(404);
      expect((await http().get('/books').expect(200)).body).toEqual([]);
      expect(
        (await http().get('/me/books').set(headers).expect(200)).body,
      ).toEqual([]);

      const [row] = await ctx.dataSource.query(
        'SELECT id, deleted_at FROM books WHERE id = ?',
        [book.id],
      );
      expect(row.deleted_at).not.toBeNull();
    });

    it("returns 403 for someone else's book and keeps it", async () => {
      const foreign = await createBook(ctx, await createUser(ctx), {
        published: true,
      });

      await http().delete(`/me/books/${foreign.id}`).set(headers).expect(403);

      await http().get(`/books/${foreign.id}`).expect(200);
    });

    it('requires authentication', async () => {
      const book = await createBook(ctx, author);

      await http().delete(`/me/books/${book.id}`).expect(401);
    });

    it('returns 404 for unknown and already deleted books', async () => {
      const deleted = await createBook(ctx, author, { deletedAt: new Date() });

      await http().delete('/me/books/999').set(headers).expect(404);
      await http().delete(`/me/books/${deleted.id}`).set(headers).expect(404);
    });
  });
});
