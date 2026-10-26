import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ValidationFailedException } from './validation-failed.exception.js';

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

const CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  406: 'not_acceptable',
  415: 'unsupported_media_type',
  429: 'too_many_requests',
};

/**
 * Renders every exception with the API error envelope:
 * {"error": "...", "message": "...", "details": {...}}
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.describe(exception);

    response.status(status).json(body);
  }

  private describe(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof ValidationFailedException) {
      return {
        status: 400,
        body: {
          error: 'validation_error',
          message: exception.message,
          details: exception.details,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      return {
        status,
        body: {
          error: CODES[status] ?? 'http_error',
          message:
            status === 404 ? 'Resource not found' : this.messageOf(exception),
        },
      };
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);

    return {
      status: 500,
      body: { error: 'server_error', message: 'Server error' },
    };
  }

  private messageOf(exception: HttpException): string {
    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: string | string[] }).message;

    return Array.isArray(message)
      ? message.join('; ')
      : (message ?? exception.message);
  }
}
