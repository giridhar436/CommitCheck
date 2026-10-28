import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { verifyLinearConnection, defaultLinearService } from "@/lib/linear";
import { ThemeToggle } from "@/components/theme-toggle";
import { DeleteAccountButton } from "@/components/delete-account-button";
import {
  ArrowLeft,
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  GitBranch,
  Download,
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
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[800px] mx-auto px-6 h-18 flex items-center justify-between">
          <Link
            href="/freelancer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors bg-surface-inset hover:bg-surface-raised px-3 py-1.5 rounded-full border border-border"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-tight text-ink">CommitCheck</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
            Account & Integrations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1 mb-2">
            Freelancer Workspace Settings
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Manage your connected developer accounts, authorized GitHub identity, and Linear workspace task synchronization.
          </p>
        </div>

        {params.success === "linear_connected" && (
          <div className="mb-6 p-4 rounded-[10px] bg-success-bg border border-success-border flex items-center gap-3 text-xs text-success-text">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-success-dot" />
            <span>Successfully connected your Linear workspace! You can now publish approved scopes directly into Linear.</span>
          </div>
        )}

        {params.success === "linear_disconnected" && (
          <div className="mb-6 p-4 rounded-[10px] bg-surface-inset border border-border flex items-center gap-3 text-xs text-ink">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-ink-muted" />
            <span>Linear workspace disconnected successfully.</span>
          </div>
        )}

        {params.error && (
          <div className="mb-6 p-4 rounded-[10px] bg-error-bg border border-error-border flex items-start gap-3 text-xs text-error-text">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Integration Error</p>
              <p className="mt-0.5">{params.error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Linear Workspace Integration Card */}
          <div className="p-7 rounded-[14px] border border-border bg-surface-raised saas-card-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-border-soft gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#5e6ad2] flex items-center justify-center text-white shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">Linear Workspace</h3>
                  <p className="text-xs text-ink-muted">Issue and task tracking synchronization</p>
                </div>
              </div>

              {linearStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border self-start sm:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-surface-inset text-ink-muted border border-border self-start sm:self-center">
                  Not Connected
                </span>
              )}
            </div>

            {linearStatus.connected && linearStatus.workspace ? (
              <div className="space-y-4">
                <div className="p-5 rounded-[10px] bg-surface border border-border text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
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
                  <div className="text-base font-bold text-ink">
                    {linearStatus.workspace.name}
                  </div>
                  {linearStatus.teams && linearStatus.teams.length > 0 && (
                    <div className="mt-3.5 pt-3.5 border-t border-border flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-ink-muted">Accessible Teams:</span>
                      {linearStatus.teams.map((t) => (
                        <span
                          key={t.id}
                          className="px-2.5 py-0.5 rounded-[4px] bg-surface-raised border border-border text-xs font-mono font-medium text-ink shadow-xs"
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
                      className="px-4 py-2 text-xs font-semibold text-error-text hover:bg-error-bg border border-error-border rounded-[8px] transition-colors cursor-pointer"
                    >
                      Disconnect Workspace
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink-muted mb-5 leading-relaxed">
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
          <div className="p-7 rounded-[14px] border border-border bg-surface-raised saas-card-shadow">
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-border-soft">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-inset border border-border flex items-center justify-center text-ink shadow-xs">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">GitHub Account</h3>
                  <p className="text-xs text-ink-muted">Primary identity provider for Freelancer role</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
                <span className="w-1.5 h-1.5 rounded-full bg-success-dot"></span>
                Verified
              </span>
            </div>

            <div className="text-xs text-ink-muted space-y-2.5">
              <div className="flex items-center justify-between">
                <span>GitHub Username:</span>
                <span className="font-bold text-ink">@{user?.githubUsername || "developer"}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border-soft">
                <span>Account Email:</span>
                <span className="text-ink font-medium">{session.email}</span>
              </div>
            </div>
          </div>

          {/* Data Rights & Privacy Controls */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised airbnb-shadow-hover">
            <div className="pb-4 mb-4 border-b border-border-soft">
              <h3 className="text-base font-semibold text-ink">
                Data Management & Privacy Rights
              </h3>
              <p className="text-xs text-ink-muted">
                Export your project staging data or request account deletion
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[8px] bg-surface-inset border border-border">
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    Export My Projects & Audits
                  </span>
                  <span className="text-xs text-ink-muted">
                    Download a comprehensive JSON archive of your projects, Linear mappings, and meetings.
                  </span>
                </div>
                <a
                  href="/api/account/export"
                  download
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-surface-raised border border-border hover:bg-surface-inset text-xs font-medium text-ink transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[8px] bg-error-bg border border-error-border">
                <div>
                  <span className="text-sm font-semibold text-error-text block">
                    Delete Account & Workspace
                  </span>
                  <span className="text-xs text-ink-muted">
                    Permanently delete your user profile and all associated staged projects and draft tickets.
                  </span>
                </div>
                <DeleteAccountButton
                  label="Delete Account"
                  confirmMessage="Are you sure you want to delete your account? All projects and staged drafts will be permanently removed."
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
