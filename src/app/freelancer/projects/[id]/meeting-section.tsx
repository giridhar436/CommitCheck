"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Radio,
  FileText,
  Clock,
  UserCheck,
} from "lucide-react";

export interface Meeting {
  id: string;
  meetUrl: string;
  status: "SCHEDULED" | "JOINING" | "RECORDING" | "TRANSCRIBING" | "COMPLETED" | "FAILED";
  transcript: string | null;
  transcriptJson: string | null;
  createdAt: string;
}

export const GOOGLE_MEET_REGEX = /^https:\/\/meet\.google\.com\/[a-z0-9\-]+$/i;

export function isValidGoogleMeetUrl(url: string): boolean {
  if (!url) return false;
  return GOOGLE_MEET_REGEX.test(url.trim());
}

export async function validateAndDispatchMeeting({
  meetUrl,
  projectId,
  fetchFn = fetch,
}: {
  meetUrl: string;
  projectId: string;
  fetchFn?: typeof fetch;
}): Promise<{ success: boolean; meeting?: Meeting; error?: string }> {
  const trimmedUrl = meetUrl.trim();
  if (!trimmedUrl) {
    return { success: false, error: "Please enter a Google Meet room link." };
  }
  if (!isValidGoogleMeetUrl(trimmedUrl)) {
    return {
      success: false,
      error: "Invalid Google Meet URL. Must match format 'https://meet.google.com/xxx-yyyy-zzz'.",
    };
  }

  const res = await fetchFn(`/api/projects/${projectId}/meetings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetUrl: trimmedUrl, autoSimulate: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || "Failed to dispatch meeting bot" };
  }

  return { success: true, meeting: data.meeting };
}

export function MeetingSection({
  projectId,
  initialMeetings,
}: {
  projectId: string;
  initialMeetings: Meeting[];
}) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [meetUrl, setMeetUrl] = useState(initialMeetings[0]?.meetUrl || "");
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMeeting = meetings[0];
  const isUrlValid = isValidGoogleMeetUrl(meetUrl);
  const isMeetingInProgress =
    activeMeeting?.status === "JOINING" ||
    activeMeeting?.status === "RECORDING" ||
    activeMeeting?.status === "TRANSCRIBING";

  const isDispatchDisabled = dispatching || !isUrlValid || isMeetingInProgress;

  // Poll status when active meeting is in progress
  useEffect(() => {
    if (!activeMeeting || activeMeeting.status === "COMPLETED" || activeMeeting.status === "FAILED") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/meetings`);
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.meetings || []);
        }
      } catch {
        // silent polling catch
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, activeMeeting]);

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDispatching(true);

    try {
      const result = await validateAndDispatchMeeting({
        meetUrl,
        projectId,
      });

      if (!result.success) {
        setError(result.error || "Failed to dispatch meeting bot");
        return;
      }

      if (result.meeting) {
        setMeetings((prev) => [result.meeting!, ...prev]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDispatching(false);
    }
  }

  function renderStatusBadge(status: Meeting["status"]) {
    switch (status) {
      case "RECORDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Radio className="w-3.5 h-3.5 animate-pulse text-[#ff385c]" />
            Recording in Progress
          </span>
        );
      case "JOINING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Bot Joining Room
          </span>
        );
      case "TRANSCRIBING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Transcribing Call
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Transcript Ingested
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#c13515] border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Call Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Dispatch Bot Card */}
      <div className="p-6 md:p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#dddddd] gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                Recall.ai Meeting Bot
              </span>
            </div>
            <h3 className="text-xl font-semibold text-[#222222]">
              Record Discovery Call & Ingest Scope
            </h3>
            <p className="text-xs text-[#6a6a6a] mt-0.5">
              Paste your Google Meet room link. The CommitCheck bot will join, record commitments, and diarize speakers.
            </p>
          </div>

          {activeMeeting ? (
            renderStatusBadge(activeMeeting.status)
          ) : dispatching ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Dispatching Bot...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd]">
              No meeting dispatched
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[8px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDispatch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6a6a6a]">
              <Video className="w-4 h-4" />
            </div>
            <input
              type="url"
              required
              placeholder="Paste your Google Meet room link"
              value={meetUrl}
              onChange={(e) => {
                setMeetUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={dispatching || isMeetingInProgress}
              className="w-full h-12 pl-10 pr-3.5 rounded-[8px] border border-[#dddddd] bg-white text-sm text-[#222222] placeholder:text-[#929292] focus:outline-none focus:border-[#222222] transition-colors disabled:bg-[#f7f7f7] disabled:text-[#6a6a6a]"
            />
          </div>

          <button
            type="submit"
            disabled={isDispatchDisabled}
            className="inline-flex items-center justify-center gap-2 px-6 h-12 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {dispatching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching Bot...
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                Dispatch Bot Now
              </>
            )}
          </button>
        </form>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#6a6a6a]">
          <p>
            Instant bot admission into your call. Webhook ingestion updates transcript segments in real-time.
          </p>
          {activeMeeting && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span>{isMeetingInProgress ? "Active room:" : "Meeting room:"}</span>
              <span className="font-mono text-[#222222] font-medium">{activeMeeting.meetUrl}</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Viewer Card */}
      {activeMeeting && activeMeeting.transcript && (
        <div className="p-6 md:p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#dddddd]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center text-[#222222]">
                <FileText className="w-5 h-5 text-[#222222]" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#222222]">
                  Diarized Discovery Transcript
                </h4>
                <p className="text-xs text-[#6a6a6a]">
                  Recorded from room: <span className="font-mono">{activeMeeting.meetUrl}</span>
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Verbatim
            </div>
          </div>

          {/* Transcript Render */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {activeMeeting.transcriptJson ? (
              (() => {
                try {
                  const segments = JSON.parse(activeMeeting.transcriptJson);
                  return segments.map((seg: any, idx: number) => {
                    const minutes = Math.floor((seg.startTime || 0) / 60);
                    const seconds = Math.floor((seg.startTime || 0) % 60);
                    const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                    const isClient = seg.speaker?.toLowerCase().includes("client") || seg.speaker?.includes("Elena");

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd] text-sm"
                      >
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span
                            className={`font-semibold flex items-center gap-1.5 ${
                              isClient ? "text-[#ff385c]" : "text-[#222222]"
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {seg.speaker}
                          </span>
                          <span className="text-[#6a6a6a] font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-[#3f3f3f] leading-relaxed mt-1">{seg.words}</p>
                      </div>
                    );
                  });
                } catch {
                  return (
                    <pre className="whitespace-pre-wrap text-xs text-[#3f3f3f] bg-[#f7f7f7] p-4 rounded-[8px]">
                      {activeMeeting.transcript}
                    </pre>
                  );
                }
              })()
            ) : (
              <pre className="whitespace-pre-wrap text-xs text-[#3f3f3f] bg-[#f7f7f7] p-4 rounded-[8px]">
                {activeMeeting.transcript}
              </pre>
            )}
          </div>

          {/* Ticket 5 Scope Review Indicator */}
          <div className="mt-6 pt-6 border-t border-[#dddddd] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f7f7f7] -mx-6 -mb-6 md:-mx-8 md:-mb-8 p-6 rounded-b-[14px]">
            <div>
              <div className="text-xs font-semibold text-[#222222] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
                Transcript Ingested & Diarized
              </div>
              <p className="text-xs text-[#6a6a6a] mt-0.5">
                Atomic deliverables and requirements are ready for Gemini scope extraction in the section below.
              </p>
            </div>

            <a
              href="#scope-review"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#222222] hover:bg-black text-white text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
              Review Extracted Scope
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
