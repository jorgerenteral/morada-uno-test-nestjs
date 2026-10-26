import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';

export interface CreateUserInput {
  username: string;
  password: string;
  authorPseudonym: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    const rounds = this.config.getOrThrow<number>('bcryptRounds');

    return this.users.save(
      this.users.create({
        username: input.username,
        authorPseudonym: input.authorPseudonym,
        password: await bcrypt.hash(input.password, rounds),
      }),
    );
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.users.findOneBy({ username });
  }

  verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }
}
