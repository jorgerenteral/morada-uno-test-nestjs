import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../users/user.entity.js';

/** Prices live in the database as numbers but travel as "9.99" strings. */
const priceTransformer = {
  to: (value: string | number | undefined) =>
    value === undefined ? value : Number(value),
  from: (value: number | null) =>
    value === null ? value : Number(value).toFixed(2),
};

@Entity('books')
@Index(['published', 'deletedAt'])
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'author_id', type: 'integer' })
  authorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true })
  coverImageUrl: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: priceTransformer,
  })
  price: string;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  /** Soft delete marker: TypeORM excludes rows where it is set from every find. */
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
