"use client";

import { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Check,
  Edit2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Clock,
  ListTodo,
  ExternalLink,
  Send,
} from "lucide-react";

export interface TaskDraftUI {
  id: string;
  meetingId: string;
  projectId: string | null;
  title: string;
  description: string;
  priority: number;
  estimate: number | null;
  status: "DRAFT" | "APPROVED" | "DISCARDED" | "SYNCED";
  linearIssueId?: string | null;
  linearIssueKey?: string | null;
  linearIssueUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinearTeamUI {
  id: string;
  name: string;
  key: string;
}

export function ScopeReviewSection({
  projectId,
  meetingId,
  initialDrafts,
  hasTranscript,
  isLinearConnected,
  linearTeams = [],
  initialLinearProjectId = null,
  initialLinearProjectUrl = null,
}: {
  projectId: string;
  meetingId: string | null;
  initialDrafts: TaskDraftUI[];
  hasTranscript: boolean;
  isLinearConnected: boolean;
  linearTeams?: LinearTeamUI[];
  initialLinearProjectId?: string | null;
  initialLinearProjectUrl?: string | null;
}) {
  const [drafts, setDrafts] = useState<TaskDraftUI[]>(initialDrafts);
  const [extracting, setExtracting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [linearProjectUrl, setLinearProjectUrl] = useState<string | null>(
    initialLinearProjectUrl || null
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    linearTeams[0]?.id || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manual task creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<number>(2);
  const [newEstimate, setNewEstimate] = useState<number>(2);
  const [addingTask, setAddingTask] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<number>(2);
  const [editEstimate, setEditEstimate] = useState<number>(2);

  async function handleExtractScope() {
    if (!meetingId) {
      setError("No recorded meeting found to extract scope from.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setExtracting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/scope/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract scope deliverables");
      }

      setDrafts(data.drafts || []);
      setSuccessMessage(
        `Gemini 1.5 Pro successfully extracted ${data.drafts.length} actionable deliverables.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  function startEditing(draft: TaskDraftUI) {
    setEditingId(draft.id);
    setEditTitle(draft.title);
    setEditDescription(draft.description);
    setEditPriority(draft.priority);
    setEditEstimate(draft.estimate ?? 2);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleSaveEdit(draftId: string) {
    setSavingId(draftId);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/scope/drafts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          updates: {
            title: editTitle,
            description: editDescription,
            priority: editPriority,
            estimate: editEstimate,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task draft");
      }

      setDrafts((prev) =>
        prev.map((d) => (d.id === draftId ? { ...d, ...data.draft } : d))
      );
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDeleteDraft(draftId: string) {
    if (!confirm("Are you sure you want to remove this deliverable draft?")) return;
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/scope/drafts?draftId=${encodeURIComponent(draftId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task draft");
      }

      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddManualTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAddingTask(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/scope/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: meetingId || "manual",
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          estimate: newEstimate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task draft");
      }

      setDrafts((prev) => [...prev, data.draft]);
      setNewTitle("");
      setNewDescription("");
      setNewPriority(2);
      setNewEstimate(2);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingTask(false);
    }
  }

  async function handleApproveAll() {
    setApproving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/scope/drafts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveAll: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve drafts");
      }

      setDrafts(data.drafts || []);
      setSuccessMessage("Scope approved! Deliverables are staged for Linear project sync.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  }

  async function handlePublishToLinear() {
    setPublishing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/linear/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeamId || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish to Linear");
      }

      setLinearProjectUrl(data.result.linearProjectUrl);
      setSuccessMessage(
        `Successfully published ${data.result.publishedIssuesCount} issues to Linear! Stakeholder notification email dispatched.`
      );

      // Refresh drafts
      const draftsRes = await fetch(`/api/projects/${projectId}/scope/drafts`);
      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setDrafts(draftsData.drafts || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  function getPriorityBadge(priority: number) {
    switch (priority) {
      case 1:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            P1 Urgent
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            P2 High
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            P3 Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
            P4 Low
          </span>
        );
    }
  }

  const allApproved = drafts.length > 0 && drafts.every((d) => d.status === "APPROVED");
  const approvedCount = drafts.filter((d) => d.status === "APPROVED").length;

  return (
    <div id="scope-review" className="mt-8 space-y-6">
      <div className="p-6 md:p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[#dddddd] gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
                Gemini 1.5 Pro AI Pipeline
              </span>
            </div>
            <h3 className="text-xl font-semibold text-[#222222]">
              Interactive Scope Review & Deliverable Staging
            </h3>
            <p className="text-xs text-[#6a6a6a] mt-0.5">
              Review and adjust AI-extracted commitments before publishing to Linear.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {drafts.length > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f7f7f7] border border-[#dddddd] text-[#222222]">
                <ListTodo className="w-3.5 h-3.5 mr-1.5 text-[#6a6a6a]" />
                {approvedCount} of {drafts.length} Approved
              </span>
            )}

            <button
              onClick={handleExtractScope}
              disabled={extracting || !hasTranscript}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#222222] hover:bg-black text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shrink-0"
              title={
                !hasTranscript
                  ? "Record a meeting first to generate transcript"
                  : "Run Gemini 1.5 Pro extraction"
              }
            >
              {extracting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff385c]" />
                  Extracting Scope...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
                  {drafts.length > 0 ? "Re-Extract Scope" : "Extract Scope with Gemini"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-[8px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-[8px] bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Empty State */}
        {drafts.length === 0 && !extracting && (
          <div className="text-center py-12 px-4 rounded-[12px] bg-[#f7f7f7] border border-dashed border-[#dddddd]">
            <Layers className="w-10 h-10 text-[#6a6a6a] mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-[#222222]">No Deliverables Staged Yet</h4>
            <p className="text-xs text-[#6a6a6a] max-w-md mx-auto mt-1 mb-4">
              {hasTranscript
                ? "Your discovery call transcript is ready. Click 'Extract Scope with Gemini' above to parse commitments into structured tasks."
                : "Record your Google Meet discovery call above to generate a diarized transcript for AI scope extraction."}
            </p>
            <div className="flex items-center justify-center gap-3">
              {hasTranscript && (
                <button
                  onClick={handleExtractScope}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Extract Scope with Gemini
                </button>
              )}
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-xs font-semibold text-[#222222] cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Manual Task
              </button>
            </div>
          </div>
        )}

        {/* Task Cards List */}
        {drafts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
                Staged Deliverables ({drafts.length})
              </span>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff385c] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? "Cancel Manual Add" : "Add Task Manually"}
              </button>
            </div>

            {/* Manual Task Add Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddManualTask}
                className="p-5 rounded-[12px] bg-[#f7f7f7] border border-[#dddddd] space-y-4 animate-in fade-in duration-200"
              >
                <div className="font-semibold text-sm text-[#222222] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#ff385c]" />
                  Add Manual Deliverable
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement webhook signature verification"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    Acceptance Criteria & Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Details, tests, and deliverables..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-3 rounded-[8px] border border-[#dddddd] bg-white text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#222222] mb-1">
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] bg-white text-xs font-medium text-[#222222] focus:outline-none focus:border-[#222222]"
                    >
                      <option value={1}>P1 Urgent</option>
                      <option value={2}>P2 High</option>
                      <option value={3}>P3 Medium</option>
                      <option value={4}>P4 Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#222222] mb-1">
                      Estimate (Story Points)
                    </label>
                    <select
                      value={newEstimate}
                      onChange={(e) => setNewEstimate(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] bg-white text-xs font-medium text-[#222222] focus:outline-none focus:border-[#222222]"
                    >
                      <option value={1}>1 pt (Simple)</option>
                      <option value={2}>2 pts (Standard)</option>
                      <option value={3}>3 pts (Medium)</option>
                      <option value={5}>5 pts (Complex)</option>
                      <option value={8}>8 pts (Architectural)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-[8px] border border-[#dddddd] bg-white text-xs font-medium text-[#222222] hover:bg-[#f7f7f7] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-5 py-2 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {addingTask ? "Adding..." : "Add to Scope"}
                  </button>
                </div>
              </form>
            )}

            {/* List Cards */}
            {drafts.map((draft) => {
              const isEditing = editingId === draft.id;
              const isApproved = draft.status === "APPROVED";

              if (isEditing) {
                return (
                  <div
                    key={draft.id}
                    className="p-5 rounded-[12px] border-2 border-[#222222] bg-white space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-[#222222] mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#222222] mb-1">
                        Acceptance Criteria
                      </label>
                      <textarea
                        rows={3}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full p-3 rounded-[8px] border border-[#dddddd] text-sm text-[#222222] focus:outline-none focus:border-[#222222]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Priority
                        </label>
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(Number(e.target.value))}
                          className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] text-xs font-medium text-[#222222]"
                        >
                          <option value={1}>P1 Urgent</option>
                          <option value={2}>P2 High</option>
                          <option value={3}>P3 Medium</option>
                          <option value={4}>P4 Low</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#222222] mb-1">
                          Estimate
                        </label>
                        <select
                          value={editEstimate}
                          onChange={(e) => setEditEstimate(Number(e.target.value))}
                          className="w-full h-10 px-3 rounded-[8px] border border-[#dddddd] text-xs font-medium text-[#222222]"
                        >
                          <option value={1}>1 pt</option>
                          <option value={2}>2 pts</option>
                          <option value={3}>3 pts</option>
                          <option value={5}>5 pts</option>
                          <option value={8}>8 pts</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3.5 py-1.5 rounded-[8px] border border-[#dddddd] text-xs font-medium text-[#222222] hover:bg-[#f7f7f7] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(draft.id)}
                        disabled={savingId === draft.id}
                        className="px-4 py-1.5 rounded-[8px] bg-[#222222] hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {savingId === draft.id ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={draft.id}
                  className={`p-5 rounded-[12px] border transition-all ${
                    isApproved
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-[#dddddd] bg-[#ffffff] hover:border-[#b0b0b0]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(draft.priority)}

                        {draft.estimate && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
                            <Clock className="w-3 h-3 mr-1" />
                            {draft.estimate} pts
                          </span>
                        )}

                        {draft.status === "SYNCED" ? (
                          <a
                            href={draft.linearIssueUrl || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                          >
                            <Layers className="w-3 h-3 text-violet-600" />
                            {draft.linearIssueKey || "Linear Issue"}
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
                            Staged Draft
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-[#222222]">{draft.title}</h4>
                      {draft.description && (
                        <p className="text-xs text-[#6a6a6a] leading-relaxed whitespace-pre-wrap">
                          {draft.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => startEditing(draft)}
                        className="p-1.5 rounded-[6px] hover:bg-[#f7f7f7] text-[#6a6a6a] hover:text-[#222222] transition-colors cursor-pointer"
                        title="Edit Deliverable"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1.5 rounded-[6px] hover:bg-[#fff8f6] text-[#6a6a6a] hover:text-[#c13515] transition-colors cursor-pointer"
                        title="Delete Deliverable"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Scope Approval & Linear Publish Bottom Action Bar */}
            <div className="mt-8 pt-6 border-t border-[#dddddd] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f7f7f7] -mx-6 -mb-6 md:-mx-8 md:-mb-8 p-6 rounded-b-[14px]">
              {linearProjectUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div>
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Active Linear Project & Stakeholders Notified
                    </div>
                    <p className="text-xs text-[#6a6a6a] mt-0.5">
                      Deliverables are live on Linear. Resend notification email was dispatched to both client and freelancer.
                    </p>
                  </div>

                  <a
                    href={linearProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#222222] hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#ff385c]" />
                    Open Linear Project
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : allApproved ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div>
                    <div className="text-xs font-semibold text-[#222222] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Scope Approved & Ready to Publish
                    </div>
                    <p className="text-xs text-[#6a6a6a] mt-0.5">
                      Create a Linear project and publish all {drafts.length} issues in one click.
                    </p>
                  </div>

                  {!isLinearConnected ? (
                    <a
                      href="/freelancer/settings"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Connect Linear to Publish
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                      {linearTeams.length > 1 && (
                        <select
                          value={selectedTeamId}
                          onChange={(e) => setSelectedTeamId(e.target.value)}
                          className="h-10 px-3 rounded-[8px] border border-[#dddddd] bg-white text-xs font-medium text-[#222222]"
                        >
                          {linearTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              Team: {team.name} ({team.key})
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handlePublishToLinear}
                        disabled={publishing}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-semibold cursor-pointer shadow-sm transition-all disabled:opacity-50"
                      >
                        {publishing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Publishing to Linear...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Publish Project to Linear
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                  <div>
                    <div className="text-xs font-semibold text-[#222222] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#ff385c]" />
                      Pre-Publish Gate
                    </div>
                    <p className="text-xs text-[#6a6a6a] mt-0.5">
                      Review deliverables above. Approving scope locks requirements and readies issues for Linear sync.
                    </p>
                  </div>

                  <button
                    onClick={handleApproveAll}
                    disabled={approving || drafts.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[8px] bg-[#222222] hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-sm transition-all disabled:opacity-50"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Approving Scope...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#ff385c]" />
                        Approve All Scope ({drafts.length})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
