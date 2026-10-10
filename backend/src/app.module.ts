import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Phase 1 root module — wires the database layer only.
 * Feature modules (projects, meetings, commitments, …) are added in later phases.
 */
@Module({
  imports: [PrismaModule],
})
export class AppModule {}
