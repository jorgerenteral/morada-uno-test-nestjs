import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { Book } from './book.entity.js';
import { OwnBookGuard, OwnedBook } from './own-book.guard.js';
import { UpdateBookDto } from './update-book.dto.js';
import { User } from '../users/user.entity.js';
import { toOwnerBook } from './book.serializer.js';
import type { OwnerBook } from './book.serializer.js';
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

  @Get(':id')
  @UseGuards(OwnBookGuard)
  show(@OwnedBook() book: Book): OwnerBook {
    return toOwnerBook(book);
  }

  @Patch(':id')
  @UseGuards(OwnBookGuard)
  async update(
    @CurrentUser() user: User,
    @OwnedBook() book: Book,
    @Body() dto: UpdateBookDto,
  ): Promise<OwnerBook> {
    return toOwnerBook(await this.books.update(user, book, dto));
  }

  @Delete(':id')
  @UseGuards(OwnBookGuard)
  @HttpCode(204)
  remove(@OwnedBook() book: Book): Promise<void> {
    return this.books.remove(book);
  }
}
