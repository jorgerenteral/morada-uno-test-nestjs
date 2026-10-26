import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }

  /** Resolves the authenticated user; tokens of removed users are rejected. */
  async validate(payload: JwtPayload): Promise<User> {
    const id = Number(payload.sub);
    const user = Number.isInteger(id) ? await this.users.findById(id) : null;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    return user;
  }
}
