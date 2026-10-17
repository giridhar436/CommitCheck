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
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#dddddd]">
        <div className="max-w-[800px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/freelancer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#222222] hover:text-[#6a6a6a] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">CommitCheck</span>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">Account & Integrations</span>
          <h1 className="text-2xl font-semibold tracking-tight text-[#222222] mt-1 mb-2">
            Freelancer Workspace Settings
          </h1>
          <p className="text-sm text-[#6a6a6a]">
            Manage your connected development services, GitHub access, and Linear workspace synchronizations.
          </p>
        </div>

        {params.success === "linear_connected" && (
          <div className="mb-6 p-4 rounded-[8px] bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>Successfully connected your Linear workspace! You can now publish approved scopes directly into Linear.</span>
          </div>
        )}

        {params.success === "linear_disconnected" && (
          <div className="mb-6 p-4 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd] flex items-center gap-3 text-sm text-[#222222]">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-[#6a6a6a]" />
            <span>Linear workspace disconnected successfully.</span>
          </div>
        )}

        {params.error && (
          <div className="mb-6 p-4 rounded-[8px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Integration Error</p>
              <p className="text-xs mt-0.5">{params.error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Linear Workspace Integration Card */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#f7f7f7] gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5e6ad2] flex items-center justify-center text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#222222]">Linear Workspace</h3>
                  <p className="text-xs text-[#6a6a6a]">Issue and task tracking synchronization</p>
                </div>
              </div>

              {linearStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#f7f7f7] text-[#6a6a6a] border border-[#dddddd] self-start sm:self-center">
                  Not Connected
                </span>
              )}
            </div>

            {linearStatus.connected && linearStatus.workspace ? (
              <div className="space-y-4">
                <div className="p-4 rounded-[8px] bg-[#f7f7f7] border border-[#dddddd] text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
                      Active Organization
                    </span>
                    <a
                      href={`https://linear.app/${linearStatus.workspace.urlKey || ""}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[#5e6ad2] hover:underline flex items-center gap-1"
                    >
                      Open in Linear
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-base font-semibold text-[#222222]">
                    {linearStatus.workspace.name}
                  </div>
                  {linearStatus.teams && linearStatus.teams.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#dddddd] flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-[#6a6a6a]">Accessible Teams:</span>
                      {linearStatus.teams.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-[4px] bg-white border border-[#dddddd] text-xs font-medium text-[#222222]"
                        >
                          {t.name} ({t.key})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <form action="/api/auth/linear/disconnect" method="POST">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-medium text-[#c13515] hover:bg-[#fff8f6] border border-[#fbd5cb] rounded-[8px] transition-colors cursor-pointer"
                    >
                      Disconnect Workspace
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#3f3f3f] mb-4">
                  Connect your Linear workspace via OAuth to enable 1-click publishing of agreed project deliverables from your Google Meet discovery transcripts.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="/api/auth/linear/connect"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#5e6ad2] hover:bg-[#4b55ac] text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <Layers className="w-4 h-4" />
                    Connect Linear Account
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* GitHub Identity Card */}
          <div className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#f7f7f7]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-white">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#222222]">GitHub Account</h3>
                  <p className="text-xs text-[#6a6a6a]">Primary identity provider for Freelancer role</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

            <div className="text-sm text-[#3f3f3f]">
              <div className="flex items-center justify-between">
                <span>GitHub Username:</span>
                <span className="font-semibold text-[#222222]">@{user?.githubUsername || "developer"}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Account Email:</span>
                <span className="text-[#6a6a6a]">{session.email}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
