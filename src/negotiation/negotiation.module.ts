import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { NegotiationGuard } from './negotiation.guard.js';
import { XmlInterceptor } from './xml.interceptor.js';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: NegotiationGuard },
    { provide: APP_INTERCEPTOR, useClass: XmlInterceptor },
  ],
})
export class NegotiationModule {}
