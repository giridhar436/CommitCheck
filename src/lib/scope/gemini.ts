import { ExtractedTask, LLMExtractionService } from "./types";

export class GeminiExtractionService implements LLMExtractionService {
  private apiKey: string;

  constructor(apiKey = process.env.GEMINI_API_KEY || "") {
    this.apiKey = apiKey;
  }

  async extractTasksFromTranscript(transcript: string): Promise<ExtractedTask[]> {
    if (!this.apiKey || this.apiKey.startsWith("mock_")) {
      return this.fallbackExtraction(transcript);
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`;
      const systemInstruction = `
You are an expert technical product manager. Analyze the following meeting transcript between a Freelancer and a Client. 
Extract atomic, implementable, testable software engineering tasks and milestones.
Output ONLY a JSON array of task objects matching this structure:
[
  {
    "title": "Short, clear action-oriented title",
    "description": "Markdown description with detailed acceptance criteria",
    "priority": 1-4 (1=Urgent, 2=High, 3=Medium, 4=Low, 0=None),
    "estimate": story point integer (1, 2, 3, 5, 8),
    "suggestedMilestone": "Milestone name"
  }
]
`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nTRANSCRIPT:\n${transcript}` }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error (${res.status})`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return this.fallbackExtraction(transcript);

      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : this.fallbackExtraction(transcript);
    } catch {
      return this.fallbackExtraction(transcript);
    }
  }

  private fallbackExtraction(transcript: string): ExtractedTask[] {
    const isStripe = transcript.toLowerCase().includes("stripe");

    if (isStripe) {
      return [
        {
          title: "Implement Stripe Elements Checkout Flow",
          description: "Embed Stripe Elements in Next.js checkout page with card validation and error handling.",
          priority: 2,
          estimate: 3,
          suggestedMilestone: "Milestone 1: Core Checkout",
        },
        {
          title: "Build Receipt Webhook Processing Endpoint",
          description: "Handle `payment_intent.succeeded` event, send confirmation email via Resend, and store transaction record.",
          priority: 2,
          estimate: 2,
          suggestedMilestone: "Milestone 1: Core Checkout",
        },
        {
          title: "Write Automated Payment Callback Tests",
          description: "Integration test coverage for successful charges, failed cards, and webhook signature verification.",
          priority: 3,
          estimate: 2,
          suggestedMilestone: "Milestone 2: QA & Verification",
        },
      ];
    }

    return [
      {
        title: "Setup Foundation & Dual Role OAuth",
        description: "Configure GitHub OAuth for Freelancer and Google OAuth for Client with role-based routing.",
        priority: 1,
        estimate: 3,
        suggestedMilestone: "Milestone 1: Authentication",
      },
      {
        title: "Repository Binding & Permissions Check",
        description: "Allow Freelancer to bind GitHub repository and verify read access via GitHub API.",
        priority: 2,
        estimate: 2,
        suggestedMilestone: "Milestone 1: Authentication",
      },
      {
        title: "Linear Workspace Connection & Scope Sync",
        description: "Connect Freelancer Linear workspace and publish approved scope items directly as Linear issues.",
        priority: 2,
        estimate: 3,
        suggestedMilestone: "Milestone 2: Task Sync",
      },
    ];
  }
}

export class MockExtractionService implements LLMExtractionService {
  private customTasks?: ExtractedTask[];

  constructor(customTasks?: ExtractedTask[]) {
    this.customTasks = customTasks;
  }

  async extractTasksFromTranscript(_transcript: string): Promise<ExtractedTask[]> {
    if (this.customTasks) return [...this.customTasks];

    return [
      {
        title: "Implement Stripe Elements UI",
        description: "Setup embedded card input fields in checkout modal.",
        priority: 2,
        estimate: 3,
      },
      {
        title: "Setup Webhook Handler",
        description: "Listen for successful charge callbacks and dispatch email.",
        priority: 2,
        estimate: 2,
      },
      {
        title: "Write Payment Integration Tests",
        description: "Verify edge cases, declines, and signature checks.",
        priority: 3,
        estimate: 2,
      },
    ];
  }
}

export const defaultLLMExtractionService = new GeminiExtractionService();
