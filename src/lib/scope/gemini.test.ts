import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GeminiExtractionService,
  SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION,
} from "./gemini";
import { triggerScopeExtraction } from "./service";
import { InMemoryTaskDraftRepository } from "./adapter";
import { InMemoryMeetingRepository } from "../meetings/adapter";
import { InMemoryUserRepository } from "../auth/adapter";
import { InMemoryProjectRepository } from "../projects/adapter";
import { ComprehensiveScopeAnalysis, LLMExtractionService } from "./types";

describe("Live Gemini Scope Classification & Caching Engine (VAR-17)", () => {
  const sampleTranscript = `
[00:01] Sarah (Client): Hi Alex, glad we connected. We need an automated invoice generation system with PDF downloads.
[00:15] Alex (Freelancer): Absolutely. We will build the PDF invoice generator and email dispatch on payment confirmation.
[00:30] Sarah (Client): Perfect. Also, could we maybe consider WhatsApp message notifications in the future? Not sure yet.
[00:45] Alex (Freelancer): I commit to having the PDF generator demo ready by Thursday 3 PM for our milestone review.
`;

  it("configures model to gemini-3.8-flash by default and supports custom model overrides", () => {
    const prevEnv = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;

    try {
      const defaultService = new GeminiExtractionService("test-key");
      assert.strictEqual((defaultService as any).model, "gemini-3.8-flash");

      const customService = new GeminiExtractionService("test-key", "gemini-custom-flash");
      assert.strictEqual((customService as any).model, "gemini-custom-flash");

      process.env.GEMINI_MODEL = "gemini-3.8-flash";
      const envService = new GeminiExtractionService("test-key");
      assert.strictEqual((envService as any).model, "gemini-3.8-flash");
    } finally {
      if (prevEnv !== undefined) {
        process.env.GEMINI_MODEL = prevEnv;
      } else {
        delete process.env.GEMINI_MODEL;
      }
    }
  });

  it("passes the configured model (gemini-3.8-flash) and valid JSON config without deprecated parameters to GoogleGenAI SDK", async () => {
    let capturedParams: any;

    const fakeAi = {
      models: {
        async generateContent(params: any) {
          capturedParams = params;
          return {
            text: JSON.stringify({
              summary: "SDK Verified Meeting",
              explicitRequirements: [
                {
                  title: "Test Task",
                  description: "Test description",
                  priority: 2,
                  estimate: 3,
                  evidence: "Test evidence",
                  confidence: 0.95,
                  suggestedMilestone: "M1",
                },
              ],
              aiInferredRequirements: [],
              tentativeRequirements: [],
              confirmedCommitments: [],
            }),
          };
        },
      },
    };

    class TestGeminiService extends GeminiExtractionService {
      protected getAiClient(): any {
        return fakeAi;
      }
    }

    const service = new TestGeminiService("live_test_key_for_spy", "gemini-3.8-flash");
    const result = await service.analyzeTranscript(sampleTranscript);

    assert.ok(capturedParams);
    assert.strictEqual(capturedParams.model, "gemini-3.8-flash");
    assert.strictEqual(capturedParams.config.responseMimeType, "application/json");
    // Ensure deprecated generation parameters like temperature are not present
    assert.strictEqual(capturedParams.config.temperature, undefined);
    assert.strictEqual(capturedParams.config.topP, undefined);
    assert.strictEqual(capturedParams.config.topK, undefined);
    assert.strictEqual(result.explicitRequirements.length, 1);
    assert.strictEqual(result.explicitRequirements[0].title, "Test Task");
  });

  it("defines the single-call 4-tier classification system instruction", () => {
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("explicitRequirements"));
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("aiInferredRequirements"));
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("tentativeRequirements"));
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("confirmedCommitments"));
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("evidence"));
    assert.ok(SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION.includes("confidence"));
  });

  it("normalizes LLM output, clamping confidence scores and ensuring valid priority values", () => {
    const service = new GeminiExtractionService();
    const mockRaw = {
      summary: "Executive scope review",
      explicitRequirements: [
        {
          title: "PDF Invoice Generator",
          description: "Generate downloadable PDF invoices",
          priority: 2,
          estimate: 3,
          evidence: "Sarah: We need an automated invoice generation system",
          confidence: 1.45, // Out of bounds -> should clamp to 1.0
          suggestedMilestone: "Milestone 1",
        },
      ],
      aiInferredRequirements: [
        {
          title: "Setup PDF Template Caching",
          description: "Cache rendered templates in memory",
          priority: 99, // Invalid priority -> should fallback to 3
          estimate: 2,
          evidence: "Inferred baseline for PDF generation performance",
          confidence: -0.2, // Out of bounds -> should clamp to 0.0
        },
      ],
      tentativeRequirements: [
        {
          title: "WhatsApp Alerts",
          description: "Dispatch WhatsApp messages",
          priority: 4,
          estimate: 5,
          evidence: "Sarah: could we maybe consider WhatsApp message notifications",
          confidence: 0.55,
        },
      ],
      confirmedCommitments: [
        {
          title: "Demo by Thursday 3 PM",
          description: "Present working PDF demo to client",
          priority: 1,
          estimate: 1,
          evidence: "Alex: I commit to having the PDF generator demo ready by Thursday 3 PM",
          confidence: 0.99,
        },
      ],
    };

    const normalized = (service as any).normalizeAnalysis(mockRaw, sampleTranscript);

    assert.strictEqual(normalized.summary, "Executive scope review");
    assert.strictEqual(normalized.explicitRequirements[0].confidence, 1.0);
    assert.strictEqual(normalized.explicitRequirements[0].priority, 2);

    assert.strictEqual(normalized.aiInferredRequirements[0].confidence, 0.0);
    assert.strictEqual(normalized.aiInferredRequirements[0].priority, 3);

    assert.strictEqual(normalized.tentativeRequirements[0].confidence, 0.55);
    assert.strictEqual(normalized.tentativeRequirements[0].classification, "TENTATIVE");

    assert.strictEqual(normalized.confirmedCommitments[0].confidence, 0.99);
    assert.strictEqual(normalized.confirmedCommitments[0].classification, "CONFIRMED_COMMITMENT");
  });

  it("caches analysis in Meeting record and reuses cache without calling Gemini API on subsequent extractions", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_var17",
        email: "alex@freelancer.dev",
        name: "Alex Dev",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Invoice App",
      clientEmail: "sarah@client.com",
      githubRepoFullName: "alex/invoice-app",
    });

    const meeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/inv-scope-test",
      "bot_var17",
      "COMPLETED"
    );
    await meetingRepo.updateMeetingStatus(meeting.id, "COMPLETED", sampleTranscript);

    let llmCallCount = 0;
    const trackingLLM: LLMExtractionService = {
      async analyzeTranscript(transcript: string): Promise<ComprehensiveScopeAnalysis> {
        llmCallCount++;
        return {
          summary: "Tracked scope analysis",
          explicitRequirements: [
            {
              title: "Generate PDF Invoices",
              description: "PDF export",
              classification: "EXPLICIT",
              priority: 2,
              estimate: 3,
              evidence: "Sarah: We need an automated invoice generation system",
              confidence: 0.95,
            },
          ],
          aiInferredRequirements: [
            {
              title: "PDF Storage Bucket Setup",
              description: "S3 or Supabase Storage for generated PDFs",
              classification: "AI_INFERRED",
              priority: 3,
              estimate: 2,
              evidence: "Inferred: Cloud storage baseline",
              confidence: 0.85,
            },
          ],
          tentativeRequirements: [
            {
              title: "WhatsApp Notifications",
              description: "Optional alerts",
              classification: "TENTATIVE",
              priority: 4,
              estimate: 5,
              evidence: "Sarah: could we maybe consider WhatsApp",
              confidence: 0.5,
            },
          ],
          confirmedCommitments: [
            {
              title: "Deliver Working Demo by Thursday 3 PM",
              description: "Live demo of PDF generation",
              classification: "CONFIRMED_COMMITMENT",
              priority: 1,
              estimate: 2,
              evidence: "Alex: I commit to having the PDF generator demo ready by Thursday 3 PM",
              confidence: 0.98,
            },
          ],
        };
      },
      async extractTasksFromTranscript(transcript: string) {
        const analysis = await this.analyzeTranscript(transcript);
        return [
          ...analysis.explicitRequirements,
          ...analysis.confirmedCommitments,
          ...analysis.aiInferredRequirements,
          ...analysis.tentativeRequirements,
        ];
      },
    };

    // First Call: LLM must be called exactly once
    const firstDrafts = await triggerScopeExtraction(
      meeting.id,
      freelancer.id,
      userRepo,
      meetingRepo,
      projectRepo,
      draftRepo,
      trackingLLM
    );

    assert.strictEqual(llmCallCount, 1);
    assert.strictEqual(firstDrafts.length, 4);

    // Verify Meeting.analysisJson and analyzedAt are populated in the database
    const cachedMeeting = await meetingRepo.findMeetingById(meeting.id);
    assert.ok(cachedMeeting?.analysisJson);
    assert.ok(cachedMeeting?.analyzedAt);

    const parsedJson = JSON.parse(cachedMeeting.analysisJson);
    assert.strictEqual(parsedJson.summary, "Tracked scope analysis");

    // Second Call with an LLM that throws if called: should reuse cache without error
    const rejectingLLM: LLMExtractionService = {
      async analyzeTranscript() {
        throw new Error("FAIL: LLM should not be called when analysis is already cached!");
      },
      async extractTasksFromTranscript() {
        throw new Error("FAIL: LLM should not be called when analysis is already cached!");
      },
    };

    const secondDrafts = await triggerScopeExtraction(
      meeting.id,
      freelancer.id,
      userRepo,
      meetingRepo,
      projectRepo,
      draftRepo,
      rejectingLLM
    );

    // Drafts are reused without re-invoking the LLM
    assert.strictEqual(secondDrafts.length, 4);
    assert.strictEqual(llmCallCount, 1); // Still 1, never incremented
  });

  it("seeds LinearTaskDraft staging records with correct classifications and approval requirements", async () => {
    const userRepo = new InMemoryUserRepository();
    const meetingRepo = new InMemoryMeetingRepository();
    const projectRepo = new InMemoryProjectRepository();
    const draftRepo = new InMemoryTaskDraftRepository();
    const geminiService = new GeminiExtractionService(); // Uses fallback for deterministic tests

    const freelancer = await userRepo.upsertOAuthUser(
      {
        provider: "github",
        providerId: "gh_stage_test",
        email: "bob@freelance.org",
      },
      "FREELANCER"
    );

    const project = await projectRepo.createProject(freelancer.id, {
      title: "Stripe Project",
      clientEmail: "client@stripe.test",
      githubRepoFullName: "bob/stripe-proj",
    });

    const meeting = await meetingRepo.createMeeting(
      project.id,
      "https://meet.google.com/stripe-meet",
      "bot_stripe",
      "COMPLETED"
    );
    await meetingRepo.updateMeetingStatus(
      meeting.id,
      "COMPLETED",
      "Client: We need Stripe checkout for cards. Maybe Apple Pay later. I commit to Friday demo."
    );

    const drafts = await triggerScopeExtraction(
      meeting.id,
      freelancer.id,
      userRepo,
      meetingRepo,
      projectRepo,
      draftRepo,
      geminiService
    );

    // Check all 4 classifications are present
    const explicit = drafts.filter((d) => d.classification === "EXPLICIT");
    const commitment = drafts.filter((d) => d.classification === "CONFIRMED_COMMITMENT");
    const inferred = drafts.filter((d) => d.classification === "AI_INFERRED");
    const tentative = drafts.filter((d) => d.classification === "TENTATIVE");

    assert.ok(explicit.length > 0, "Explicit requirements should be present");
    assert.ok(commitment.length > 0, "Confirmed commitments should be present");
    assert.ok(inferred.length > 0, "AI-inferred requirements should be present");
    assert.ok(tentative.length > 0, "Tentative requirements should be present");

    // Client approval rules
    explicit.forEach((item) => {
      assert.strictEqual(item.clientApprovalStatus, "NOT_REQUIRED");
      assert.ok(typeof item.confidence === "number" && item.confidence >= 0.8);
      assert.ok(item.evidence !== null);
    });

    commitment.forEach((item) => {
      assert.strictEqual(item.clientApprovalStatus, "NOT_REQUIRED");
      assert.ok(typeof item.confidence === "number" && item.confidence >= 0.9);
      assert.ok(item.evidence !== null);
    });

    inferred.forEach((item) => {
      assert.strictEqual(item.clientApprovalStatus, "PENDING_CLIENT_APPROVAL");
      assert.ok(item.confidence !== null && item.confidence !== undefined);
      assert.ok(item.evidence !== null);
    });

    tentative.forEach((item) => {
      assert.strictEqual(item.clientApprovalStatus, "PENDING_CLIENT_APPROVAL");
      assert.ok(item.confidence !== null && item.confidence !== undefined);
      assert.ok(item.evidence !== null);
    });
  });
});
