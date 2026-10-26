import request from 'supertest';
import { User } from '../src/users/user.entity.js';
import { createBook, createUser } from './support/factories.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Public books (e2e)', () => {
  let ctx: TestApp;
  let lohgarra: User;
  let chewbacca: User;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    lohgarra = await createUser(ctx, {
      username: 'lohgarra',
      authorPseudonym: 'Lohgarra',
    });
    chewbacca = await createUser(ctx, {
      username: 'chewbacca',
      authorPseudonym: 'Chewbacca',
    });
  });

  afterAll(() => ctx.close());

  const get = (url: string) => request(ctx.app.getHttpServer()).get(url);
  const ids = (body: { id: number }[]) => body.map((book) => book.id);

  it('lists only published books that are not deleted', async () => {
    const visible = await createBook(ctx, lohgarra, { published: true });
    await createBook(ctx, lohgarra, { title: 'My Draft Manuscript' });
    await createBook(ctx, lohgarra, {
      published: true,
      deletedAt: new Date(),
    });
    const other = await createBook(ctx, chewbacca, { published: true });

    const response = await get('/books').expect(200);

    expect(ids(response.body)).toEqual([visible.id, other.id]);
  });

  it('serializes books with the public schema', async () => {
    const book = await createBook(ctx, lohgarra, {
      title: 'Adventures on Kashyyyk',
      description: 'A thrilling tale of...',
      price: '9.9',
      coverImageUrl: 'https://example.com/cover.jpg',
      published: true,
    });

    const response = await get(`/books/${book.id}`).expect(200);

    expect(response.body).toEqual({
      id: book.id,
      title: 'Adventures on Kashyyyk',
      description: 'A thrilling tale of...',
      author_pseudonym: 'Lohgarra',
      cover_image_url: 'https://example.com/cover.jpg',
      price: '9.90',
      published: true,
    });
  });

  it('returns a null cover when the book has none', async () => {
    const book = await createBook(ctx, lohgarra, { published: true });

    const response = await get(`/books/${book.id}`).expect(200);

    expect(response.body.cover_image_url).toBeNull();
  });

  it('returns 404 for unpublished, deleted, unknown and malformed ids', async () => {
    const draft = await createBook(ctx, lohgarra);
    const deleted = await createBook(ctx, lohgarra, {
      published: true,
      deletedAt: new Date(),
    });

    for (const id of [draft.id, deleted.id, 999, 'abc']) {
      const response = await get(`/books/${id}`).expect(404);

      expect(response.body.error).toBe('not_found');
    }
  });

  describe('search', () => {
    it('matches title or description ignoring case', async () => {
      const byTitle = await createBook(ctx, lohgarra, {
        title: 'Adventures on Kashyyyk',
        published: true,
      });
      const byDescription = await createBook(ctx, lohgarra, {
        title: 'Life Debt',
        description: 'A great ADVENTURE awaits',
        published: true,
      });
      await createBook(ctx, chewbacca, {
        title: "Smuggler's Run",
        description: 'Fast ships',
        published: true,
      });
      await createBook(ctx, lohgarra, { title: 'Draft adventure' });
      await createBook(ctx, lohgarra, {
        title: 'Deleted adventure',
        published: true,
        deletedAt: new Date(),
      });

      const response = await get('/books?search=adventure').expect(200);

      expect(ids(response.body)).toEqual([byTitle.id, byDescription.id]);
    });

    it('treats % and _ literally', async () => {
      const match = await createBook(ctx, lohgarra, {
        title: '100% Wookie',
        published: true,
      });
      await createBook(ctx, lohgarra, { title: 'Other', published: true });

      const response = await get('/books?search=%25').expect(200);

      expect(ids(response.body)).toEqual([match.id]);
    });
  });

  describe('author filter', () => {
    it('is an exact, case-insensitive match on the pseudonym', async () => {
      const mine = await createBook(ctx, lohgarra, { published: true });
      await createBook(ctx, chewbacca, { published: true });

      const exact = await get('/books?author=LOHGARRA').expect(200);
      const partial = await get('/books?author=lohgar').expect(200);

      expect(ids(exact.body)).toEqual([mine.id]);
      expect(partial.body).toEqual([]);
    });

    it('combines with search using AND', async () => {
      const match = await createBook(ctx, lohgarra, {
        title: 'Life Debt: A Wookie Story',
        published: true,
      });
      await createBook(ctx, lohgarra, {
        title: 'Adventures on Kashyyyk',
        published: true,
      });
      await createBook(ctx, chewbacca, {
        title: 'Wookie smuggler',
        published: true,
      });

      const response = await get('/books?search=wookie&author=lohgarra').expect(
        200,
      );

      expect(ids(response.body)).toEqual([match.id]);
    });
  });

  it('does not accept write methods', async () => {
    await request(ctx.app.getHttpServer()).post('/books').send({}).expect(404);
  });
});
