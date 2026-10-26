import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<TokenResponse> {
    const user = await this.users.findByUsername(username);

    if (!user || !(await this.users.verifyPassword(user, password))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return {
      access_token: await this.jwt.signAsync({ sub: String(user.id) }),
      token_type: 'bearer',
    };
  }
}
