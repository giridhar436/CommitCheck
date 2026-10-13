import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseAdminService } from './supabase-admin.service';

/**
 * Authentication module (Phase 15).
 *
 * Registers SupabaseAuthGuard as a global APP_GUARD so every route in the
 * application requires a verified Supabase access token by default. There
 * is deliberately no opt-out: any endpoint that must not be reachable
 * without identity does not exist in this API.
 */
@Module({
  controllers: [AuthController],
  providers: [
    SupabaseAdminService,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [SupabaseAdminService],
})
export class AuthModule {}
