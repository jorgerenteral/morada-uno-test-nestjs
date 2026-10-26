import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { NegotiatedRequest } from './negotiation.guard.js';
import { encodeXml } from './xml-encoder.js';

/**
 * Serializes successful responses as XML when the client asked for it. Empty
 * responses (204) are left alone and errors are always JSON, as the API error
 * contract requires: they never pass through here.
 */
@Injectable()
export class XmlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<NegotiatedRequest>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (request.format !== 'xml' || data === undefined) {
          return data;
        }

        http.getResponse<Response>().type('application/xml');
        return encodeXml(data);
      }),
    );
  }
}
