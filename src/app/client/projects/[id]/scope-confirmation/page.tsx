"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#ff385c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-[#717171]">Loading scope items...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#ffffff] border border-[#dddddd] rounded-2xl p-8 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="w-14 h-14 bg-[#10b981]/10 text-[#10b981] rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-[#222222] mb-2 tracking-tight">
            Scope Decisions Saved
          </h1>
          <p className="text-sm text-[#717171] leading-relaxed mb-6">
            Thank you! Your approved items have been added to the project baseline, and any rejected ideas remain outside scope.
          </p>
          <Link
            href="/client"
            className="inline-block w-full py-3 bg-[#ff385c] hover:bg-[#e00b41] text-[#ffffff] font-semibold text-sm rounded-lg transition-colors"
          >
            Go to Client Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-[#ffffff] border border-[#dddddd] rounded-2xl p-8 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center space-x-3 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff385c]" />
            <span className="text-xs font-semibold tracking-wider uppercase text-[#717171]">
              Scope Protection Gateway
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-[#222222] tracking-tight mb-2">
            Confirm Project Scope Items
          </h1>
          <p className="text-sm text-[#717171] leading-relaxed">
            The items below were mentioned in your recent discovery call as casual ideas or suggested baselines.
            Items confirmed here enter approved development scope. Items rejected stay excluded to protect against unexpected costs.
          </p>
        </div>

        {error && (
          <div className="bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] text-sm rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {drafts.length === 0 ? (
          <div className="bg-[#ffffff] border border-[#dddddd] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-12 h-12 bg-[#f7f7f7] text-[#717171] rounded-full flex items-center justify-center text-xl mx-auto mb-3">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-[#222222] mb-1">
              No Pending Items Awaiting Review
            </h3>
            <p className="text-sm text-[#717171] mb-6">
              All extracted deliverables for this project are already explicitly confirmed.
            </p>
            <Link
              href="/client"
              className="inline-block py-2.5 px-6 bg-[#ffffff] border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-semibold text-sm rounded-lg transition-colors"
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
                  className={`bg-[#ffffff] border rounded-xl p-6 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${
                    isApproved ? "border-[#dddddd]" : "border-[#e5e7eb] opacity-75"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          isTentative
                            ? "bg-[#fef3c7] text-[#92400e]"
                            : "bg-[#e0e7ff] text-[#3730a3]"
                        }`}
                      >
                        {isTentative ? "Tentative Idea" : "AI Suggested Baseline"}
                      </span>
                      {draft.estimate && (
                        <span className="text-xs text-[#717171] font-mono bg-[#f7f7f7] px-2 py-0.5 rounded">
                          {draft.estimate} pts
                        </span>
                      )}
                    </div>

                    {/* Toggle Buttons */}
                    <div className="inline-flex rounded-lg border border-[#dddddd] p-0.5 bg-[#f7f7f7]">
                      <button
                        type="button"
                        onClick={() => toggleDecision(draft.id, true)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          isApproved
                            ? "bg-[#10b981] text-[#ffffff] shadow-sm"
                            : "text-[#717171] hover:text-[#222222]"
                        }`}
                      >
                        ✓ Approve for Scope
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDecision(draft.id, false)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          !isApproved
                            ? "bg-[#ef4444] text-[#ffffff] shadow-sm"
                            : "text-[#717171] hover:text-[#222222]"
                        }`}
                      >
                        ✕ Reject & Exclude
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-[#222222] mb-1.5">
                    {draft.title}
                  </h3>
                  <p className="text-sm text-[#484848] leading-relaxed mb-3">
                    {draft.description}
                  </p>

                  {draft.evidence && (
                    <div className="bg-[#f7f7f7] border-l-2 border-[#ff385c] p-3 rounded-r-lg text-xs text-[#717171] italic">
                      <strong className="text-[#222222] not-italic mr-1">Transcript Evidence:</strong>
                      &ldquo;{draft.evidence}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Sticky Action Bar */}
            <div className="bg-[#ffffff] border border-[#dddddd] rounded-2xl p-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div>
                <p className="text-sm font-semibold text-[#222222]">
                  Ready to confirm decisions?
                </p>
                <p className="text-xs text-[#717171]">
                  Approved items will be authorized for execution.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#ff385c] hover:bg-[#e00b41] disabled:opacity-50 text-[#ffffff] font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                {submitting ? "Saving Decisions..." : "Submit Scope Decisions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
