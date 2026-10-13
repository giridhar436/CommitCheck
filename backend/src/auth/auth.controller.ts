import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '../common/api-response';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './auth-user.interface';

/**
 * Identity endpoints (Phase 15). Supabase Auth issues tokens on the client;
 * the backend only re-verifies them, so there is no login/register/logout
 * surface here — `GET /auth/me` lets clients confirm a token is valid and
 * learn who they are.
 */
@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthUser): ApiResponse<AuthUser> {
    return {
      success: true,
      message: 'Authenticated user fetched successfully',
      data: { id: user.id, email: user.email },
    };
  }
}
