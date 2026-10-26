import request from 'supertest';
import { User } from '../src/users/user.entity.js';
import { bearer } from './support/auth.js';
import { createBook, createUser } from './support/factories.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Darth Vader rule (e2e)', () => {
  let ctx: TestApp;
  let vader: User;
  let headers: { Authorization: string };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    vader = await createUser(ctx, {
      username: 'darth_vader',
      authorPseudonym: 'Darth Vader',
    });
    headers = await bearer(ctx, vader);
  });

  afterAll(() => ctx.close());

  const http = () => request(ctx.app.getHttpServer());

  it('cannot publish a book', async () => {
    const book = await createBook(ctx, vader);

    const response = await http()
      .patch(`/me/books/${book.id}`)
      .set(headers)
      .send({ published: true })
      .expect(403);

    expect(response.body).toEqual({
      error: 'forbidden',
      message: 'Darth Vader is not allowed to publish on Wookie Books',
    });
    await http().get(`/books/${book.id}`).expect(404);
  });

  it('cannot publish while updating other fields either', async () => {
    const book = await createBook(ctx, vader, { title: 'Dark Side' });

    await http()
      .patch(`/me/books/${book.id}`)
      .set(headers)
      .send({ title: 'Renamed', published: true })
      .expect(403);

    const stored = await http().get(`/me/books/${book.id}`).set(headers);
    expect(stored.body.title).toBe('Dark Side');
  });

  it('still manages his drafts', async () => {
    const created = await http()
      .post('/me/books')
      .set(headers)
      .send({ title: 'Dark Side', description: 'Join us', price: '6.66' })
      .expect(201);
    expect(created.body.published).toBe(false);

    await http()
      .patch(`/me/books/${created.body.id}`)
      .set(headers)
      .send({ title: 'Renamed', published: false })
      .expect(200);

    await http()
      .delete(`/me/books/${created.body.id}`)
      .set(headers)
      .expect(204);
  });

  it('does not affect other authors', async () => {
    const chewbacca = await createUser(ctx, { username: 'chewbacca' });
    const book = await createBook(ctx, chewbacca);

    const response = await http()
      .patch(`/me/books/${book.id}`)
      .set(await bearer(ctx, chewbacca))
      .send({ published: true })
      .expect(200);

    expect(response.body.published).toBe(true);
  });

  it('is checked after ownership', async () => {
    const foreign = await createBook(ctx, await createUser(ctx));

    const response = await http()
      .patch(`/me/books/${foreign.id}`)
      .set(headers)
      .send({ published: true })
      .expect(403);

    expect(response.body.message).toBe('You do not own this book');
  });
});
