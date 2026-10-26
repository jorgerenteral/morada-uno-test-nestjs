import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/book.entity.js';
import { UsersModule } from '../users/users.module.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Book])],
  providers: [SeedService],
  exports: [SeedService],
})
export class DatabaseModule {}
