import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './book.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  exports: [TypeOrmModule],
})
export class BooksModule {}
