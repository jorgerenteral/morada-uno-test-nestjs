import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('token')
  @HttpCode(200)
  token(@Body() body: LoginDto): Promise<TokenResponse> {
    return this.auth.login(body.username, body.password);
  }
}
