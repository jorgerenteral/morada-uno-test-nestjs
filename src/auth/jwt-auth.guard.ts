import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../users/user.entity.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = User>(err: unknown, user: T | false): T {
    if (err || !user) {
      throw new UnauthorizedException('Authentication is required');
    }

    return user;
  }
}
