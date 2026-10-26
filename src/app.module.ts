import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.js';
import { BooksModule } from './books/books.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: config.getOrThrow<string>('database.path'),
        synchronize: config.getOrThrow<boolean>('database.synchronize'),
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    BooksModule,
  ],
})
export class AppModule {}
