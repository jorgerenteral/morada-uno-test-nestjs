import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './book.entity.js';
import { ListBooksQuery } from './list-books.query.js';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
  ) {}

  /**
   * Public catalog: published books that are not soft deleted (TypeORM adds the
   * `deleted_at IS NULL` condition on its own), optionally filtered.
   */
  findPublic(filters: ListBooksQuery): Promise<Book[]> {
    const query = this.books
      .createQueryBuilder('book')
      .innerJoinAndSelect('book.author', 'author')
      .where('book.published = 1')
      .orderBy('book.id', 'ASC');

    if (filters.search) {
      const term = `%${escapeLike(filters.search.toLowerCase())}%`;

      query.andWhere(
        "(LOWER(book.title) LIKE :term ESCAPE '\\' OR LOWER(book.description) LIKE :term ESCAPE '\\')",
        { term },
      );
    }

    if (filters.author) {
      query.andWhere('LOWER(author.authorPseudonym) = :author', {
        author: filters.author.toLowerCase(),
      });
    }

    return query.getMany();
  }

  async findPublicById(id: number): Promise<Book> {
    const book = await this.books.findOne({
      where: { id, published: true },
      relations: { author: true },
    });

    if (!book) {
      throw new NotFoundException();
    }

    return book;
  }
}

/** `%` and `_` are plain characters when the user searches for them. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
