import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth-user.interface';

/**
 * Injects the authenticated user (established by SupabaseAuthGuard)
 * into a handler parameter: `me(@CurrentUser() user: AuthUser)`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().authUser as AuthUser;
  },
);
