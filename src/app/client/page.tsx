import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { ShieldCheck, LogOut, CheckCircle2, AlertOctagon, TrendingUp, Sparkles } from "lucide-react";

export default async function ClientDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=CLIENT");
  }

  if (session.role !== "CLIENT") {
    redirect("/freelancer");
  }

  return (
    <div className="min-h-screen bg-white text-[#222222] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dddddd]">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
                <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                  Client Audit Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name || "Client Avatar"}
                  className="w-9 h-9 rounded-full object-cover border border-[#dddddd]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#f7f7f7] border border-[#dddddd] flex items-center justify-center text-xs font-bold text-[#ff385c]">
                  {(session.name || session.email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-[#222222]">{session.name || session.email}</span>
                <span className="text-xs text-[#6a6a6a]">{session.email}</span>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da]">
              CLIENT
            </span>

            <a
              href="/api/auth/logout"
              className="p-2 text-[#6a6a6a] hover:text-[#222222] transition-colors rounded-full hover:bg-[#f7f7f7]"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] mx-auto px-6 py-10 w-full">
        {/* Header */}
        <div className="pb-8 mb-8 border-b border-[#dddddd]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">Executive Oversight</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Verified Authenticated
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#222222]">
            Deliverable Verification & Code Audits
          </h1>
          <p className="text-sm text-[#6a6a6a] mt-1">
            Track whether tasks completed in Linear are backed by actual code commits in GitHub.
          </p>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Overall Confidence</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-semibold text-[#222222] my-2">100%</div>
            <p className="text-xs text-[#6a6a6a]">
              Proportion of closed tasks with verified matching commits.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Ghost Completions</span>
              <AlertOctagon className="w-4 h-4 text-[#6a6a6a]" />
            </div>
            <div className="text-3xl font-semibold text-[#222222] my-2">0</div>
            <p className="text-xs text-[#6a6a6a]">
              Tasks marked Done without any linked commits or diffs.
            </p>
          </div>

          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">AI Verification</span>
              <Sparkles className="w-4 h-4 text-[#ff385c]" />
            </div>
            <div className="text-3xl font-semibold text-[#222222] my-2">Dual-Tier</div>
            <p className="text-xs text-[#6a6a6a]">
              Syntactic regex matching + Gemini 1.5 Pro semantic code diff verification.
            </p>
          </div>
        </div>

        {/* Empty / Initial State */}
        <div className="rounded-[14px] border border-dashed border-[#dddddd] bg-[#f7f7f7] p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-white border border-[#dddddd] flex items-center justify-center mx-auto mb-4 text-[#ff385c]">
              <ShieldCheck className="w-6 h-6 text-[#ff385c]" />
            </div>
            <h3 className="text-lg font-semibold text-[#222222] mb-1">Waiting for Project Invitations</h3>
            <p className="text-sm text-[#6a6a6a] mb-6">
              When your freelancer creates a project and completes a discovery call, their verified Linear project and audit reports will appear here.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#dddddd] text-xs font-medium text-[#222222]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Client Portal Auth Active
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
