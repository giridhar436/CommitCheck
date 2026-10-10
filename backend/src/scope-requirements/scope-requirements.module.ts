import { Module } from '@nestjs/common';
import { ScopeRequirementsController } from './scope-requirements.controller';
import { ScopeRequirementsService } from './scope-requirements.service';

@Module({
  controllers: [ScopeRequirementsController],
  providers: [ScopeRequirementsService],
})
export class ScopeRequirementsModule {}
