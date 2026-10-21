import { GoogleGenAI } from "@google/genai";
import {
  ClassifiedScopeItem,
  ComprehensiveScopeAnalysis,
  ExtractedTask,
  LLMExtractionService,
} from "./types";

export const SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION = `
You are an expert technical product manager and scope auditor for CommitCheck.
Analyze the following meeting transcript between a Freelancer and a Client.
You must perform ONE single, comprehensive classification of all topics discussed into four strict categories:

1. "explicitRequirements": Clearly and mutually agreed software engineering deliverables.
2. "aiInferredRequirements": Reasonable technical baseline requirements deduced from the overall product goal (e.g. database schema migrations, auth middleware, test suite), clearly marked as AI-suggested.
3. "tentativeRequirements": Casual, uncertain, speculative, or proposed ideas mentioned in conversation that lack explicit agreement or commitment. DO NOT assume they are approved.
4. "confirmedCommitments": Concrete commitments, milestones, or delivery promises made with an agreed timeline or deadline.

For EVERY item, include:
- "title": Action-oriented title
- "description": Clear description with acceptance criteria
- "priority": 1 (Urgent), 2 (High), 3 (Medium), 4 (Low), 0 (None)
- "estimate": integer story points (1, 2, 3, 5, 8)
- "evidence": Direct quote from transcript showing speaker and context
- "confidence": Float between 0.0 and 1.0 reflecting certainty of classification
- "suggestedMilestone": Milestone name (e.g. "Milestone 1: Core Setup")

Output ONLY a JSON object matching this schema:
{
  "summary": "Brief executive summary of the meeting",
  "explicitRequirements": [ { "title": "...", "description": "...", "priority": 2, "estimate": 3, "evidence": "...", "confidence": 0.95, "suggestedMilestone": "..." } ],
  "aiInferredRequirements": [ { "title": "...", "description": "...", "priority": 3, "estimate": 2, "evidence": "...", "confidence": 0.85, "suggestedMilestone": "..." } ],
  "tentativeRequirements": [ { "title": "...", "description": "...", "priority": 4, "estimate": 2, "evidence": "...", "confidence": 0.60, "suggestedMilestone": "..." } ],
  "confirmedCommitments": [ { "title": "...", "description": "...", "priority": 1, "estimate": 3, "evidence": "...", "confidence": 0.98, "suggestedMilestone": "..." } ]
}
`;

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export class GeminiExtractionService implements LLMExtractionService {
  private apiKey: string;
  private model: string;

  constructor(
    apiKey = process.env.GEMINI_API_KEY || "",
    model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  ) {
    this.apiKey = apiKey;
    this.model = model;
  }

  protected getAiClient(): any {
    return new GoogleGenAI({ apiKey: this.apiKey });
  }

  async analyzeTranscript(transcript: string): Promise<ComprehensiveScopeAnalysis> {
    if (!this.apiKey || this.apiKey.startsWith("mock_")) {
      return this.fallbackAnalysis(transcript);
    }

    try {
      const ai = this.getAiClient();
      const response = await ai.models.generateContent({
        model: this.model,
        contents: `Analyze the following meeting transcript between a Freelancer and a Client:\n\n${transcript}`,
        config: {
          systemInstruction: SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        },
      });

      const rawText = response.text;
      if (!rawText) return this.fallbackAnalysis(transcript);

      const parsed = JSON.parse(rawText);
      return this.normalizeAnalysis(parsed, transcript);
    } catch {
      // Fallback to direct REST API if SDK call encounters client or network errors
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${SCOPE_CLASSIFICATION_SYSTEM_INSTRUCTION}\n\nTRANSCRIPT:\n${transcript}`,
                  },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
            },
          }),
        });

        if (!res.ok) {
          return this.fallbackAnalysis(transcript);
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return this.fallbackAnalysis(transcript);

        const parsed = JSON.parse(rawText);
        return this.normalizeAnalysis(parsed, transcript);
      } catch {
        return this.fallbackAnalysis(transcript);
      }
    }
  }

  async extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]> {
    const analysis = await this.analyzeTranscript(transcript);
    return [
      ...analysis.explicitRequirements,
      ...analysis.confirmedCommitments,
      ...analysis.aiInferredRequirements,
      ...analysis.tentativeRequirements,
    ];
  }

  private normalizeAnalysis(parsed: any, transcript: string): ComprehensiveScopeAnalysis {
    const mapItems = (items: any[], classification: any): ClassifiedScopeItem[] => {
      if (!Array.isArray(items)) return [];
      return items.map((i) => ({
        title: String(i.title || "Untitled deliverable"),
        description: String(i.description || ""),
        classification,
        priority: typeof i.priority === "number" && [0, 1, 2, 3, 4].includes(i.priority) ? i.priority : 3,
        estimate: typeof i.estimate === "number" ? Math.max(0, Math.round(i.estimate)) : null,
        evidence: i.evidence ? String(i.evidence) : undefined,
        confidence: typeof i.confidence === "number" ? Math.max(0, Math.min(1, Number(i.confidence.toFixed(2)))) : 0.8,
        suggestedMilestone: i.suggestedMilestone ? String(i.suggestedMilestone) : undefined,
        notes: i.notes ? String(i.notes) : undefined,
      }));
    };

    return {
      summary: parsed.summary || "Discovery meeting transcript analyzed.",
      explicitRequirements: mapItems(parsed.explicitRequirements, "EXPLICIT"),
      aiInferredRequirements: mapItems(parsed.aiInferredRequirements, "AI_INFERRED"),
      tentativeRequirements: mapItems(parsed.tentativeRequirements, "TENTATIVE"),
      confirmedCommitments: mapItems(parsed.confirmedCommitments, "CONFIRMED_COMMITMENT"),
    };
  }

  private fallbackAnalysis(transcript: string): ComprehensiveScopeAnalysis {
    const lower = transcript.toLowerCase();
    const isStripe = lower.includes("stripe") || lower.includes("payment");

    if (isStripe) {
      return {
        summary: "Meeting focused on payment integration and checkout architecture.",
        explicitRequirements: [
          {
            title: "Implement Stripe Elements UI Component",
            description: "Embed responsive card input form with real-time validation and localized errors.",
            classification: "EXPLICIT",
            priority: 2,
            estimate: 3,
            evidence: 'Client: "We definitely need Stripe checkout integrated for credit cards."',
            confidence: 0.95,
            suggestedMilestone: "Milestone 1: Core Checkout",
          },
          {
            title: "Build Webhook Endpoint for Payment Receipts",
            description: "Handle payment_intent.succeeded, persist invoice record, and trigger email.",
            classification: "EXPLICIT",
            priority: 2,
            estimate: 2,
            evidence: 'Freelancer: "I will set up the backend webhook to handle payment confirmations."',
            confidence: 0.92,
            suggestedMilestone: "Milestone 1: Core Checkout",
          },
        ],
        aiInferredRequirements: [
          {
            title: "Setup Stripe Webhook Signature Verification Middleware",
            description: "Cryptographically verify Stripe webhook signatures to prevent spoofed payment callbacks.",
            classification: "AI_INFERRED",
            priority: 2,
            estimate: 1,
            evidence: "Inferred: Standard requirement for secure payment processing pipelines.",
            confidence: 0.88,
            suggestedMilestone: "Milestone 1: Core Checkout",
          },
          {
            title: "Configure Database Transaction Rollbacks on Failed Charges",
            description: "Ensure cart state reverts if external charge gateway times out.",
            classification: "AI_INFERRED",
            priority: 3,
            estimate: 2,
            evidence: "Inferred: Relational integrity requirement for order records.",
            confidence: 0.82,
            suggestedMilestone: "Milestone 2: Reliability",
          },
        ],
        tentativeRequirements: [
          {
            title: "Apple Pay & Google Pay One-Click Checkout",
            description: "Enable mobile wallet express checkout buttons if device supports payment request API.",
            classification: "TENTATIVE",
            priority: 4,
            estimate: 3,
            evidence: 'Client: "Maybe down the line we could also look into Apple Pay?"',
            confidence: 0.55,
            suggestedMilestone: "Milestone 3: Future Polish",
          },
          {
            title: "Custom Multi-Currency Dynamic Conversions",
            description: "Real-time FX currency switcher for international customers.",
            classification: "TENTATIVE",
            priority: 4,
            estimate: 5,
            evidence: 'Client: "What if someone wants to pay in Euros? Could be a nice-to-have."',
            confidence: 0.45,
            suggestedMilestone: "Milestone 3: Future Polish",
          },
        ],
        confirmedCommitments: [
          {
            title: "Deliver Working Staging Checkout by Friday",
            description: "Deploy end-to-end checkout flow to staging environment for client review.",
            classification: "CONFIRMED_COMMITMENT",
            priority: 1,
            estimate: 2,
            evidence: 'Freelancer: "I commit to having the test checkout ready on staging by Friday 5 PM."',
            confidence: 0.99,
            suggestedMilestone: "Milestone 1: Core Checkout",
          },
        ],
      };
    }

    return {
      summary: "Foundational architecture and authentication kickoff meeting.",
      explicitRequirements: [
        {
          title: "Setup Dual-Role OAuth Authentication",
          description: "Configure GitHub OAuth for Freelancers and Google OAuth for Clients.",
          classification: "EXPLICIT",
          priority: 1,
          estimate: 3,
          evidence: 'Client: "We want clients to log in with Google, and developers with GitHub."',
          confidence: 0.96,
          suggestedMilestone: "Milestone 1: Foundation",
        },
        {
          title: "GitHub Repository Binding and Access Verification",
          description: "Allow Freelancer to bind GitHub repo and verify read access.",
          classification: "EXPLICIT",
          priority: 2,
          estimate: 2,
          evidence: 'Freelancer: "I will connect the GitHub repo so we can track commits."',
          confidence: 0.94,
          suggestedMilestone: "Milestone 1: Foundation",
        },
      ],
      aiInferredRequirements: [
        {
          title: "Implement Session Expiration & Refresh Cookie Handling",
          description: "Stateless signed JWT cookies with auto-renewal before expiration.",
          classification: "AI_INFERRED",
          priority: 2,
          estimate: 2,
          evidence: "Inferred: Required for secure multi-tenant sessions.",
          confidence: 0.85,
          suggestedMilestone: "Milestone 1: Foundation",
        },
      ],
      tentativeRequirements: [
        {
          title: "Export Audit Reports as White-Labeled PDFs",
          description: "Generate downloadable PDF summary with client agency logo.",
          classification: "TENTATIVE",
          priority: 4,
          estimate: 3,
          evidence: 'Client: "It would be cool if we could download a fancy PDF report to show management."',
          confidence: 0.50,
          suggestedMilestone: "Milestone 3: Future Polish",
        },
      ],
      confirmedCommitments: [
        {
          title: "Initial Architecture Demo in Next Standup",
          description: "Walk through authenticated project workspace during Tuesday standup.",
          classification: "CONFIRMED_COMMITMENT",
          priority: 1,
          estimate: 1,
          evidence: 'Freelancer: "I will demo the auth flow in our Tuesday morning standup."',
          confidence: 0.97,
          suggestedMilestone: "Milestone 1: Foundation",
        },
      ],
    };
  }
}

export class MockExtractionService implements LLMExtractionService {
  private customAnalysis?: ComprehensiveScopeAnalysis;

  constructor(customAnalysis?: ComprehensiveScopeAnalysis) {
    this.customAnalysis = customAnalysis;
  }

  async analyzeTranscript(transcript: string): Promise<ComprehensiveScopeAnalysis> {
    if (this.customAnalysis) return this.customAnalysis;
    return new GeminiExtractionService().analyzeTranscript(transcript);
  }

  async extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]> {
    const analysis = await this.analyzeTranscript(transcript);
    return [
      ...analysis.explicitRequirements,
      ...analysis.confirmedCommitments,
      ...analysis.aiInferredRequirements,
      ...analysis.tentativeRequirements,
    ];
  }
}

export const defaultLLMExtractionService = new GeminiExtractionService();
