import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client lifecycle owner — database-layer infrastructure, not a domain
 * service. Connects on application boot and disconnects cleanly on shutdown.
 *
 * Inject PrismaService wherever a repository/query needs the database
 * (see https://docs.nestjs.com/techniques/prisma).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma Client connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
