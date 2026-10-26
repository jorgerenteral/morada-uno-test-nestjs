import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { Book } from './book.entity.js';
import { CreateBookDto } from './create-book.dto.js';
import { UpdateBookDto } from './update-book.dto.js';
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

  /** Every non-deleted book of the author, drafts included. */
  findByAuthor(author: User): Promise<Book[]> {
    return this.books.find({
      where: { authorId: author.id },
      relations: { author: true },
      order: { id: 'ASC' },
    });
  }

  /** A book that has not been soft deleted, whoever owns it. */
  findById(id: number): Promise<Book | null> {
    return this.books.findOne({
      where: { id },
      relations: { author: true },
    });
  }

  /** Books are always created as drafts; publishing is a later PATCH. */
  async createDraft(author: User, dto: CreateBookDto): Promise<Book> {
    const draft = await this.books.save(
      this.books.create({
        title: dto.title,
        description: dto.description,
        price: dto.price,
        coverImageUrl: dto.cover_image_url ?? null,
        published: false,
        authorId: author.id,
      }),
    );

    return this.books.findOneOrFail({
      where: { id: draft.id },
      relations: { author: true },
    });
  }

  async update(user: User, book: Book, dto: UpdateBookDto): Promise<Book> {
    if (dto.published === true && user.isDarthVader()) {
      throw new ForbiddenException(
        'Darth Vader is not allowed to publish on Wookie Books',
      );
    }

    await this.books.update(book.id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.cover_image_url !== undefined && {
        coverImageUrl: dto.cover_image_url,
      }),
      ...(dto.published !== undefined && { published: dto.published }),
    });

    return this.books.findOneOrFail({
      where: { id: book.id },
      relations: { author: true },
    });
  }

  /** Soft delete: sets `deleted_at`, the row stays in the database. */
  async remove(book: Book): Promise<void> {
    await this.books.softDelete(book.id);
  }
}

/** `%` and `_` are plain characters when the user searches for them. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
