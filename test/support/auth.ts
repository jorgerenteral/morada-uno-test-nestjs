import { JwtService } from '@nestjs/jwt';
import { User } from '../../src/users/user.entity.js';
import { TestApp } from './test-app.js';

/** Authorization header carrying a valid token for the given user. */
export async function bearer(
  ctx: TestApp,
  user: User,
): Promise<{ Authorization: string }> {
  const token = await ctx.app
    .get(JwtService)
    .signAsync({ sub: String(user.id) });

  return { Authorization: `Bearer ${token}` };
}
