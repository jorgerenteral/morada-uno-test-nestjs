import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  static readonly DARTH_VADER_USERNAME = 'darth_vader';

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ name: 'author_pseudonym', type: 'varchar' })
  authorPseudonym: string;

  /** Bcrypt hash, never the plain password. */
  @Column({ type: 'varchar' })
  password: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  isDarthVader(): boolean {
    return this.username === User.DARTH_VADER_USERNAME;
  }
}
