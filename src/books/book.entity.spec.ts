import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { Book } from './book.entity.js';

describe('Book entity', () => {
  let moduleRef: TestingModule;
  let books: Repository<Book>;
  let author: User;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User, Book],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, Book]),
      ],
    }).compile();

    books = moduleRef.get(getRepositoryToken(Book));
    author = await moduleRef
      .get<Repository<User>>(getRepositoryToken(User))
      .save({
        username: 'lohgarra',
        authorPseudonym: 'Lohgarra',
        password: 'hash',
      });
  });

  afterEach(() => moduleRef.close());

  const draft = (overrides: Partial<Book> = {}) =>
    books.save(
      books.create({
        title: 'Adventures on Kashyyyk',
        description: 'A thrilling tale of...',
        price: '9.9',
        authorId: author.id,
        ...overrides,
      }),
    );

  it('defaults to an unpublished book without cover or deletion marker', async () => {
    const book = await books.findOneByOrFail({ id: (await draft()).id });

    expect(book.published).toBe(false);
    expect(book.coverImageUrl).toBeNull();
    expect(book.deletedAt).toBeNull();
  });

  it('reads the price back as a string with two decimals', async () => {
    const book = await books.findOneByOrFail({ id: (await draft()).id });

    expect(book.price).toBe('9.90');
  });

  it('hides soft deleted books from finders but keeps the row', async () => {
    const book = await draft();

    await books.softDelete(book.id);

    expect(await books.findOneBy({ id: book.id })).toBeNull();
    expect(await books.find()).toHaveLength(0);

    const stored = await books.findOne({
      where: { id: book.id },
      withDeleted: true,
    });
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it('belongs to its author', async () => {
    const book = await draft();

    const loaded = await books.findOneOrFail({
      where: { id: book.id },
      relations: { author: true },
    });

    expect(loaded.author.authorPseudonym).toBe('Lohgarra');
  });
});
