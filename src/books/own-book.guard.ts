import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../users/user.entity.js';
import { Book } from './book.entity.js';
import { BooksService } from './books.service.js';

type BookRequest = Request & { user: User; book: Book };

/**
 * Loads the `:id` book and makes sure the authenticated user owns it.
 *
 * It is a guard (not a check inside the handler) so ownership is decided
 * before the body is validated: a stranger gets a 403, not hints about
 * someone else's book. Unknown and soft deleted books are a 404.
 */
@Injectable()
export class OwnBookGuard implements CanActivate {
  constructor(private readonly books: BooksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BookRequest>();
    const id = Number(request.params.id);

    const book = Number.isInteger(id) ? await this.books.findById(id) : null;
    if (!book) {
      throw new NotFoundException();
    }

    if (book.authorId !== request.user.id) {
      throw new ForbiddenException('You do not own this book');
    }

    request.book = book;
    return true;
  }
}

/** The book resolved by `OwnBookGuard`. */
export const OwnedBook = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Book =>
    context.switchToHttp().getRequest<BookRequest>().book,
);
