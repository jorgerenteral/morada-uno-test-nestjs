import { Book } from './book.entity.js';

export interface PublicBook {
  id: number;
  title: string;
  description: string;
  author_pseudonym: string;
  cover_image_url: string | null;
  price: string;
  published: boolean;
}

export interface OwnerBook extends PublicBook {
  deleted_at: string | null;
}

/** Book as shown on the public catalog. Requires `author` to be loaded. */
export function toPublicBook(book: Book): PublicBook {
  return {
    id: book.id,
    title: book.title,
    description: book.description,
    author_pseudonym: book.author.authorPseudonym,
    cover_image_url: book.coverImageUrl,
    price: book.price,
    published: book.published,
  };
}

/** Book as shown to its owner, which also exposes the soft delete marker. */
export function toOwnerBook(book: Book): OwnerBook {
  return {
    ...toPublicBook(book),
    deleted_at: book.deletedAt ? book.deletedAt.toISOString() : null,
  };
}
