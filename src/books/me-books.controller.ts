import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { User } from '../users/user.entity.js';
import { OwnerBook, toOwnerBook } from './book.serializer.js';
import { BooksService } from './books.service.js';
import { CreateBookDto } from './create-book.dto.js';

@Controller('me/books')
@UseGuards(JwtAuthGuard)
export class MeBooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<OwnerBook[]> {
    return (await this.books.findByAuthor(user)).map(toOwnerBook);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateBookDto,
  ): Promise<OwnerBook> {
    return toOwnerBook(await this.books.createDraft(user, dto));
  }
}
