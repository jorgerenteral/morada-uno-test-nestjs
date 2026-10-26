import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { ValidationFailedException } from './common/validation-failed.exception.js';

/**
 * Global behaviour shared by the real server and the e2e tests.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        ValidationFailedException.fromErrors(errors),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
