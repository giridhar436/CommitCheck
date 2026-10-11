import { Module, FactoryProvider } from '@nestjs/common';
import { MeetingAnalysisController } from './meeting-analysis.controller';
import { MeetingAnalysisService } from './meeting-analysis.service';
import { MEETING_ANALYSIS_PROVIDER } from './providers/meeting-analysis-provider';
import { DevelopmentMeetingAnalysisProvider } from './providers/development-meeting-analysis.provider';
import { MeetingAnalysisProvider } from './types/analysis-result';

/**
 * Provider selection. Phase 8 ships the deterministic development provider
 * only — the project has no AI credentials yet, and none may be invented
 * here. When a production provider lands, it implements
 * MeetingAnalysisProvider and is constructed in this factory under its own
 * MEETING_ANALYSIS_PROVIDER value; the development provider must never be
 * registered in a production deployment.
 */
function createAnalysisProvider(): MeetingAnalysisProvider {
  const requested = process.env.MEETING_ANALYSIS_PROVIDER ?? 'development';
  if (requested !== 'development') {
    throw new Error(
      `MEETING_ANALYSIS_PROVIDER="${requested}" is not available — no production AI provider is bundled yet`,
    );
  }
  return new DevelopmentMeetingAnalysisProvider();
}

@Module({
  controllers: [MeetingAnalysisController],
  providers: [
    MeetingAnalysisService,
    {
      provide: MEETING_ANALYSIS_PROVIDER,
      useFactory: createAnalysisProvider,
    } satisfies FactoryProvider,
  ],
})
export class MeetingAnalysisModule {}
