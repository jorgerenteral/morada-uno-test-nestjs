import request from 'supertest';
import { User } from '../src/users/user.entity.js';
import { bearer } from './support/auth.js';
import { createBook, createUser } from './support/factories.js';
import { createTestApp, TestApp } from './support/test-app.js';

describe('Content negotiation (e2e)', () => {
  let ctx: TestApp;
  let author: User;
  let bookId: number;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await ctx.reset();
    author = await createUser(ctx, {
      username: 'lohgarra',
      password: 'rwaaaaawr',
      authorPseudonym: 'Lohgarra',
    });
    bookId = (
      await createBook(ctx, author, {
        title: 'Tom & Jerry',
        price: '9.99',
        published: true,
      })
    ).id;
  });

  afterAll(() => ctx.close());

  const get = (url: string, accept?: string) => {
    const test = request(ctx.app.getHttpServer()).get(url);
    return accept ? test.set('Accept', accept) : test;
  };

  it('answers JSON by default', async () => {
    const response = await get('/books').expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body[0].title).toBe('Tom & Jerry');
  });

  it('answers JSON for Accept: application/json', async () => {
    const response = await get('/books', 'application/json').expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/json/);
  });

  it('answers XML lists for Accept: application/xml', async () => {
    const response = await get('/books', 'application/xml').expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/xml/);
    expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(response.text).toContain(`<id>${bookId}</id>`);
    expect(response.text).toContain('<title>Tom &amp; Jerry</title>');
    expect(response.text).toContain(
      '<author_pseudonym>Lohgarra</author_pseudonym>',
    );
    expect(response.text).toContain('<price>9.99</price>');
    expect(response.text).toContain('<cover_image_url nil="true"/>');
  });

  it('answers XML for a single book', async () => {
    const response = await get(`/books/${bookId}`, 'application/xml').expect(
      200,
    );

    expect(response.text).toContain('<response>');
    expect(response.text).toContain('<published>true</published>');
  });

  it('supports XML on authenticated endpoints', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/me/books')
      .set(await bearer(ctx, author))
      .set('Accept', 'application/xml')
      .expect(200);

    expect(response.text).toContain('<deleted_at nil="true"/>');
  });

  it('supports XML on the token endpoint', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/token')
      .set('Accept', 'application/xml')
      .send({ username: 'lohgarra', password: 'rwaaaaawr' })
      .expect(200);

    expect(response.text).toContain('<token_type>bearer</token_type>');
    expect(response.text).toContain('<access_token>');
  });

  it('answers 406 as JSON for unsupported formats', async () => {
    for (const accept of ['text/html', 'text/csv', 'application/yaml']) {
      const response = await get('/books', accept).expect(406);

      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.body.error).toBe('not_acceptable');
    }
  });

  it('rejects unsupported formats before authentication', async () => {
    await get('/me/books', 'text/csv').expect(406);
  });

  it('treats wildcards and browser headers as JSON', async () => {
    for (const accept of [
      '*/*',
      'text/html, */*;q=0.8',
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ]) {
      const response = await get('/books', accept).expect(200);

      expect(response.headers['content-type']).toMatch(/^application\/json/);
    }
  });

  it('honours quality values', async () => {
    const xml = await get(
      '/books',
      'application/json;q=0.5, application/xml;q=0.9',
    ).expect(200);
    const json = await get(
      '/books',
      'application/xml;q=0.2, application/json',
    ).expect(200);

    expect(xml.headers['content-type']).toMatch(/^application\/xml/);
    expect(json.headers['content-type']).toMatch(/^application\/json/);
  });

  it('keeps errors as JSON even when XML is requested', async () => {
    const response = await get('/books/999', 'application/xml').expect(404);

    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body.error).toBe('not_found');
  });

  it('leaves 204 responses empty', async () => {
    const response = await request(ctx.app.getHttpServer())
      .delete(`/me/books/${bookId}`)
      .set(await bearer(ctx, author))
      .set('Accept', 'application/xml')
      .expect(204);

    expect(response.text).toBe('');
  });
});
