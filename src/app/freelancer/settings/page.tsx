import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { verifyLinearConnection, defaultLinearService } from "@/lib/linear";
import {
  ArrowLeft,
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitBranch,
} from "lucide-react";

export default async function FreelancerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/?auth=required&role=FREELANCER");
  }

  if (session.role !== "FREELANCER") {
    redirect("/client");
  }

  const user = await defaultUserRepository.findById(session.userId);
  const linearStatus = await verifyLinearConnection(session.userId, defaultUserRepository, defaultLinearService);
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#18181b] font-sans flex flex-col selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e4e4e7]">
        <div className="max-w-[800px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link
            href="/freelancer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#71717a] hover:text-[#18181b] transition-colors bg-[#f4f4f5] hover:bg-[#e4e4e7] px-3 py-1.5 rounded-full border border-[#e4e4e7]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">CommitCheck</span>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
            Account & Integrations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181b] mt-1 mb-2">
            Freelancer Workspace Settings
          </h1>
          <p className="text-sm text-[#71717a] leading-relaxed">
            Manage your connected developer accounts, authorized GitHub identity, and Linear workspace task synchronization.
          </p>
        </div>

        {params.success === "linear_connected" && (
          <div className="mb-6 p-4 rounded-[10px] bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Successfully connected your Linear workspace! You can now publish approved scopes directly into Linear.</span>
          </div>
        )}

        {params.success === "linear_disconnected" && (
          <div className="mb-6 p-4 rounded-[10px] bg-[#f4f4f5] border border-[#e4e4e7] flex items-center gap-3 text-xs text-[#18181b]">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#71717a]" />
            <span>Linear workspace disconnected successfully.</span>
          </div>
        )}

        {params.error && (
          <div className="mb-6 p-4 rounded-[10px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-xs text-[#c13515]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Integration Error</p>
              <p className="mt-0.5">{params.error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Linear Workspace Integration Card */}
          <div className="p-7 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#f4f4f5] gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5e6ad2] flex items-center justify-center text-white shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#18181b]">Linear Workspace</h3>
                  <p className="text-xs text-[#71717a]">Issue and task tracking synchronization</p>
                </div>
              </div>

              {linearStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7] self-start sm:self-center">
                  Not Connected
                </span>
              )}
            </div>

            {linearStatus.connected && linearStatus.workspace ? (
              <div className="space-y-4">
                <div className="p-5 rounded-[10px] bg-[#fafafa] border border-[#e4e4e7] text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71717a]">
                      Active Workspace
                    </span>
                    <a
                      href={`https://linear.app/${linearStatus.workspace.urlKey || ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#5e6ad2] hover:underline flex items-center gap-1"
                    >
                      Open in Linear
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-base font-bold text-[#18181b]">
                    {linearStatus.workspace.name}
                  </div>
                  {linearStatus.teams && linearStatus.teams.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-[#e4e4e7] flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-[#71717a]">Accessible Teams:</span>
                      {linearStatus.teams.map((t) => (
                        <span
                          key={t.id}
                          className="px-2.5 py-0.5 rounded-[4px] bg-white border border-[#e4e4e7] text-xs font-mono font-medium text-[#18181b] shadow-xs"
                        >
                          {t.name} ({t.key})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <form action="/api/auth/linear/disconnect" method="POST">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-[#c13515] hover:bg-[#fff8f6] border border-[#fbd5cb] rounded-[8px] transition-colors cursor-pointer"
                    >
                      Disconnect Workspace
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#71717a] mb-5 leading-relaxed">
                  Connect your Linear workspace via OAuth to enable 1-click publishing of agreed project deliverables from your Google Meet discovery transcripts.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="/api/auth/linear/connect"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5e6ad2] hover:bg-[#4b55ac] text-white text-xs font-semibold transition-all shadow-sm hover:shadow"
                  >
                    <Layers className="w-4 h-4" />
                    Connect Linear Account
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* GitHub Identity Card */}
          <div className="p-7 rounded-[14px] border border-[#e4e4e7] bg-white saas-card-shadow">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#f4f4f5]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#18181b] flex items-center justify-center text-white shadow-xs">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#18181b]">GitHub Account</h3>
                  <p className="text-xs text-[#71717a]">Primary identity provider for Freelancer role</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Verified
              </span>
            </div>

            <div className="text-xs text-[#71717a] space-y-2.5">
              <div className="flex items-center justify-between">
                <span>GitHub Username:</span>
                <span className="font-bold text-[#18181b]">@{user?.githubUsername || "developer"}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#f4f4f5]">
                <span>Account Email:</span>
                <span className="text-[#18181b] font-medium">{session.email}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
