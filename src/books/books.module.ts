import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './book.entity.js';
import { BooksController } from './books.controller.js';
import { OwnBookGuard } from './own-book.guard.js';
import { MeBooksController } from './me-books.controller.js';
import { BooksService } from './books.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Book])],
  controllers: [BooksController, MeBooksController],
  providers: [BooksService, OwnBookGuard],
  exports: [BooksService],
})
export class BooksModule {}
