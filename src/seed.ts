import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { SeedService } from './database/seed.service.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

await app.get(SeedService).run();
await app.close();

console.log('Database seeded');
