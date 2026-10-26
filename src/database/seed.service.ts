import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/book.entity.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

const USERS = [
  { username: 'lohgarra', password: 'rwaaaaawr', authorPseudonym: 'Lohgarra' },
  {
    username: 'chewbacca',
    password: 'rrwwwgggh',
    authorPseudonym: 'Chewbacca',
  },
  {
    username: 'darth_vader',
    password: 'iwanttopublish',
    authorPseudonym: 'Darth Vader',
  },
];

interface SeedBook {
  id: number;
  author: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  price: string;
  published: boolean;
  deleted: boolean;
}

const BOOKS: SeedBook[] = [
  {
    id: 1,
    author: 'lohgarra',
    title: 'Adventures on Kashyyyk',
    description:
      'A thrilling tale of life among the wroshyr trees, told by someone who has seen it all.',
    coverImageUrl: 'https://example.com/covers/adventures-on-kashyyyk.jpg',
    price: '9.99',
    published: true,
    deleted: false,
  },
  {
    id: 2,
    author: 'lohgarra',
    title: 'Life Debt: A Wookie Story',
    description:
      'What does a Wookie owe the friend who saved them? A story about honor and loyalty.',
    coverImageUrl: null,
    price: '12.50',
    published: true,
    deleted: false,
  },
  {
    id: 3,
    author: 'lohgarra',
    title: 'My Draft Manuscript',
    description: 'Still a work in progress.',
    coverImageUrl: null,
    price: '5.00',
    published: false,
    deleted: false,
  },
  {
    id: 4,
    author: 'lohgarra',
    title: 'Deleted Memories',
    description: 'A book nobody should be able to find anymore.',
    coverImageUrl: null,
    price: '7.25',
    published: true,
    deleted: true,
  },
  {
    id: 5,
    author: 'chewbacca',
    title: "Smuggler's Run",
    description: 'Fast ships, bad odds and a very large co-pilot.',
    coverImageUrl: 'https://example.com/covers/smugglers-run.jpg',
    price: '14.00',
    published: true,
    deleted: false,
  },
];

/**
 * Development data from the assignment: users, and books with fixed ids so the
 * documented expectations (`/books` returns 1, 2, 5...) can be checked by hand.
 * Running it again leaves the data as it is.
 */
@Injectable()
export class SeedService {
  constructor(
    private readonly users: UsersService,
    @InjectRepository(Book) private readonly books: Repository<Book>,
  ) {}

  async run(): Promise<void> {
    const authors = new Map<string, User>();

    for (const data of USERS) {
      const existing = await this.users.findByUsername(data.username);
      authors.set(data.username, existing ?? (await this.users.create(data)));
    }

    for (const seed of BOOKS) {
      const exists = await this.books.findOne({
        where: { id: seed.id },
        withDeleted: true,
      });
      if (exists) continue;

      await this.books.save(
        this.books.create({
          id: seed.id,
          title: seed.title,
          description: seed.description,
          coverImageUrl: seed.coverImageUrl,
          price: seed.price,
          published: seed.published,
          authorId: authors.get(seed.author)!.id,
        }),
      );

      if (seed.deleted) {
        await this.books.softDelete(seed.id);
      }
    }
  }
}
