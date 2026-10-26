import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { PublicBook, toPublicBook } from './book.serializer.js';
import { ListBooksQuery } from './list-books.query.js';

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  async list(@Query() query: ListBooksQuery): Promise<PublicBook[]> {
    return (await this.books.findPublic(query)).map(toPublicBook);
  }

  @Get(':id')
  async show(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 404 })) id: number,
  ): Promise<PublicBook> {
    return toPublicBook(await this.books.findPublicById(id));
  }
}
