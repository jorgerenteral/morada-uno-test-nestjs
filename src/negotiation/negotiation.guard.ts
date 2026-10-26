import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotAcceptableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { negotiateFormat, ResponseFormat } from './accept.js';

export type NegotiatedRequest = Request & { format?: ResponseFormat };

/**
 * Global guard: it runs before any route guard, so an unsupported `Accept`
 * is a 406 even when the request would also have failed authentication.
 */
@Injectable()
export class NegotiationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<NegotiatedRequest>();
    const format = negotiateFormat(request.headers.accept);

    if (!format) {
      throw new NotAcceptableException(
        'Supported formats: application/json, application/xml',
      );
    }

    request.format = format;
    return true;
  }
}
