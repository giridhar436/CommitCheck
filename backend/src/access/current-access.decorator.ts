import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ProjectAccessContext } from './project-access.service';

/**
 * Injects the access context established by ProjectAccessGuard for the
 * current route (undefined on routes without @ProjectAccess). Used where
 * a service needs the caller's role for field-level rules the route
 * decorator cannot express (e.g. only ADMINs may change a scope
 * requirement's approvalStatus — an authorization decision).
 */
export const CurrentAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProjectAccessContext | undefined => {
    return ctx.switchToHttp().getRequest().projectAccess as
      | ProjectAccessContext
      | undefined;
  },
);
