import { Module, FactoryProvider } from '@nestjs/common';
import { MeetingAnalysisController } from './meeting-analysis.controller';
import { MeetingAnalysisService } from './meeting-analysis.service';
import { MEETING_ANALYSIS_PROVIDER } from './providers/meeting-analysis-provider';
import { DevelopmentMeetingAnalysisProvider } from './providers/development-meeting-analysis.provider';
import { FireworksMeetingAnalysisProvider } from './providers/fireworks-meeting-analysis.provider';
import { MeetingAnalysisProvider } from './types/analysis-result';
import { ScopeVerificationModule } from '../scope-verification/scope-verification.module';

/** Default Fireworks chat model when FIREWORKS_MODEL is not set. */
const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/kimi-k2-instruct';

/**
 * Provider selection via MEETING_ANALYSIS_PROVIDER:
 *   development → deterministic rule-based provider (tests/demo — never ship to production)
 *   fireworks   → production Fireworks AI provider (server-side credentials only)
 * anything else → fail fast with a clear configuration error.
 */
function createAnalysisProvider(): MeetingAnalysisProvider {
  const requested = process.env.MEETING_ANALYSIS_PROVIDER ?? 'development';
  switch (requested) {
    case 'development':
      return new DevelopmentMeetingAnalysisProvider();
    case 'fireworks': {
      const apiKey = process.env.FIREWORKS_API_KEY ?? '';
      if (!apiKey) {
        throw new Error(
          'MEETING_ANALYSIS_PROVIDER=fireworks requires FIREWORKS_API_KEY to be set',
        );
      }
      return new FireworksMeetingAnalysisProvider({
        apiKey,
        model: process.env.FIREWORKS_MODEL || DEFAULT_FIREWORKS_MODEL,
      });
    }
    default:
      throw new Error(
        `MEETING_ANALYSIS_PROVIDER="${requested}" is not recognized — use "development" or "fireworks"`,
      );
  }
}

@Module({
  imports: [ScopeVerificationModule],
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
