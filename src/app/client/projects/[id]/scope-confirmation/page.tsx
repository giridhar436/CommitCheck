"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, HelpCircle, Check, X } from "lucide-react";

interface TaskDraftItem {
  id: string;
  title: string;
  description: string;
  classification: "EXPLICIT" | "AI_INFERRED" | "TENTATIVE" | "CONFIRMED_COMMITMENT";
  clientApprovalStatus: "NOT_REQUIRED" | "PENDING_CLIENT_APPROVAL" | "CLIENT_APPROVED" | "CLIENT_REJECTED";
  evidence?: string | null;
  priority: number;
  estimate?: number | null;
}

export default function ClientScopeConfirmationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<TaskDraftItem[]>([]);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadDrafts() {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}/scope/drafts`);
        if (!res.ok) {
          throw new Error("Unable to load project deliverables.");
        }
        const data = await res.json();
        const pending = (data.drafts || []).filter(
          (d: TaskDraftItem) => d.clientApprovalStatus === "PENDING_CLIENT_APPROVAL"
        );
        setDrafts(pending);

        // Default all to approved = true
        const initialDecisions: Record<string, boolean> = {};
        pending.forEach((d: TaskDraftItem) => {
          initialDecisions[d.id] = true;
        });
        setDecisions(initialDecisions);
      } catch (err: any) {
        setError(err.message || "Failed to load scope items.");
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadDrafts();
    }
  }, [projectId]);

  const toggleDecision = (id: string, approved: boolean) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: approved,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const payload = Object.entries(decisions).map(([draftId, approved]) => ({
        draftId,
        approved,
      }));

      const res = await fetch(`/api/projects/${projectId}/scope/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: payload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit scope decisions.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#ff385c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-semibold text-[#71717a]">Loading scope deliverables...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#e4e4e7] rounded-[16px] p-8 text-center saas-card-shadow">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-emerald-200">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-[#18181b] mb-2 tracking-tight">
            Scope Decisions Saved
          </h1>
          <p className="text-sm text-[#71717a] leading-relaxed mb-6">
            Thank you! Your approved items have been added to the project baseline, and any rejected ideas remain outside scope.
          </p>
          <Link
            href="/client"
            className="inline-flex items-center justify-center w-full py-3 bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold text-xs rounded-[8px] transition-all shadow-sm"
          >
            Go to Client Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#18181b] font-sans flex flex-col selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e4e4e7]">
        <div className="max-w-3xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#71717a] hover:text-[#18181b] transition-colors bg-[#f4f4f5] hover:bg-[#e4e4e7] px-3 py-1.5 rounded-full border border-[#e4e4e7]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Client Portal
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">CommitCheck</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 w-full flex-1">
        {/* Header */}
        <div className="bg-white border border-[#e4e4e7] rounded-[14px] p-8 mb-8 saas-card-shadow">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ff385c] animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#ff385c]">
              Scope Protection Gateway
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181b] tracking-tight mb-2">
            Confirm Project Scope Items
          </h1>
          <p className="text-sm text-[#71717a] leading-relaxed">
            The items below were mentioned in your recent discovery call as casual ideas or suggested baselines.
            Items confirmed here enter approved development scope. Items rejected stay excluded to protect against unexpected costs.
          </p>
        </div>

        {error && (
          <div className="bg-[#fff8f6] border border-[#fbd5cb] text-[#c13515] text-xs font-semibold rounded-[8px] p-4 mb-6">
            {error}
          </div>
        )}

        {drafts.length === 0 ? (
          <div className="bg-white border border-dashed border-[#e4e4e7] rounded-[14px] p-12 text-center saas-card-shadow">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-xl mx-auto mb-3 border border-emerald-200">
              ✓
            </div>
            <h3 className="text-lg font-bold text-[#18181b] mb-1">
              No Pending Items Awaiting Review
            </h3>
            <p className="text-sm text-[#71717a] mb-6">
              All extracted deliverables for this project are already explicitly confirmed.
            </p>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 py-2.5 px-6 bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[#18181b] font-semibold text-xs rounded-[8px] transition-colors shadow-xs"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const isApproved = decisions[draft.id] !== false;
              const isTentative = draft.classification === "TENTATIVE";

              return (
                <div
                  key={draft.id}
                  className={`bg-white border rounded-[12px] p-6 transition-all saas-card-shadow ${
                    isApproved ? "border-[#e4e4e7]" : "border-[#e4e4e7] opacity-65"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          isTentative
                            ? "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]"
                            : "bg-[#e0e7ff] text-[#3730a3] border border-[#c7d2fe]"
                        }`}
                      >
                        {isTentative ? "Tentative Idea" : "AI Suggested Baseline"}
                      </span>
                      {draft.estimate && (
                        <span className="text-xs text-[#71717a] font-mono bg-[#f4f4f5] px-2 py-0.5 rounded border border-[#e4e4e7]">
                          {draft.estimate} pts
                        </span>
                      )}
                    </div>

                    {/* Toggle Buttons */}
                    <div className="inline-flex rounded-[8px] border border-[#e4e4e7] p-0.5 bg-[#f4f4f5]">
                      <button
                        type="button"
                        onClick={() => toggleDecision(draft.id, true)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${
                          isApproved
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-[#71717a] hover:text-[#18181b]"
                        }`}
                      >
                        ✓ Approve for Scope
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDecision(draft.id, false)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${
                          !isApproved
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-[#71717a] hover:text-[#18181b]"
                        }`}
                      >
                        ✕ Reject & Exclude
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#18181b] mb-1.5">
                    {draft.title}
                  </h3>
                  <p className="text-sm text-[#52525b] leading-relaxed mb-3">
                    {draft.description}
                  </p>

                  {draft.evidence && (
                    <div className="bg-[#fafafa] border-l-2 border-[#ff385c] p-3 rounded-r-lg text-xs text-[#71717a] italic">
                      <strong className="text-[#18181b] not-italic mr-1">Transcript Evidence:</strong>
                      &ldquo;{draft.evidence}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Sticky Action Bar */}
            <div className="bg-white border border-[#e4e4e7] rounded-[14px] p-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 saas-card-shadow">
              <div>
                <p className="text-sm font-bold text-[#18181b]">
                  Ready to confirm decisions?
                </p>
                <p className="text-xs text-[#71717a]">
                  Approved items will be authorized for execution and Linear issue tracking.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#ff385c] hover:bg-[#e00b41] disabled:opacity-50 text-white font-semibold text-xs rounded-[8px] transition-all shadow-sm hover:shadow cursor-pointer"
              >
                {submitting ? "Saving Decisions..." : "Submit Scope Decisions"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
