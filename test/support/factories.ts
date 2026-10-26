import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../../src/books/book.entity.js';
import { User } from '../../src/users/user.entity.js';
import { UsersService } from '../../src/users/users.service.js';
import { TestApp } from './test-app.js';

let sequence = 0;

export function createUser(
  ctx: TestApp,
  overrides: Partial<{
    username: string;
    password: string;
    authorPseudonym: string;
  }> = {},
): Promise<User> {
  sequence += 1;

  return ctx.app.get(UsersService).create({
    username: `user${sequence}`,
    password: 'password',
    authorPseudonym: `Author ${sequence}`,
    ...overrides,
  });
}

export async function createBook(
  ctx: TestApp,
  author: User,
  overrides: Partial<Book> = {},
): Promise<Book> {
  const books = ctx.app.get<Repository<Book>>(getRepositoryToken(Book));
  const { deletedAt, ...attributes } = overrides;

  const book = await books.save(
    books.create({
      title: 'A book',
      description: 'A story.',
      price: '9.99',
      published: false,
      authorId: author.id,
      ...attributes,
    }),
  );

  if (deletedAt) {
    await books.softDelete(book.id);
  }

  return book;
}
