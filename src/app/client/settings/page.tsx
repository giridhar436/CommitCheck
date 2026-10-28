import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { defaultProjectRepository } from "@/lib/projects";
import { DeleteAccountButton } from "@/components/delete-account-button";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Download,
  FolderGit2,
  UserCheck,
} from "lucide-react";

export default async function ClientSettingsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?auth=required&role=CLIENT&redirect=/client/settings");
  }

  if (session.role !== "CLIENT") {
    redirect("/freelancer/settings");
  }

  const projects = await defaultProjectRepository.listProjectsForClient(session.email);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[800px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-sm font-medium text-ink hover:text-ink-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Client Portal
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#ff385c] flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm">CommitCheck</span>
          </div>
        </div>
      </header>

      {/* Main Settings Content */}
      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
            Account &amp; Oversight
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink mt-1 mb-2">
            Client Workspace Settings
          </h1>
          <p className="text-sm text-ink-muted">
            Manage your verified identity, review linked projects, and export your verification audit records.
          </p>
        </div>

        <div className="space-y-6">
          {/* Identity & Role Card */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised airbnb-shadow-hover">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-soft">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rausch-bg text-[#ff385c] border border-rausch-border flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Google Identity &amp; Access
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Authenticated via Google OAuth for executive audit sign-off
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-bg text-success-text border border-success-border">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>

            <div className="space-y-3 text-sm text-ink-secondary">
              <div className="flex items-center justify-between">
                <span>Display Name:</span>
                <span className="font-semibold text-ink">{session.name || "Client"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Email:</span>
                <span className="text-ink-muted">{session.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>User Role:</span>
                <span className="px-2 py-0.5 rounded-[4px] bg-rausch-bg text-[#ff385c] font-semibold text-xs border border-rausch-border">
                  CLIENT
                </span>
              </div>
            </div>
          </div>

          {/* Linked Projects Card */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised airbnb-shadow-hover">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-soft">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-inset border border-border flex items-center justify-center text-ink">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    Assigned Freelance Projects ({projects.length})
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Projects where your email is registered as the client auditor
                  </p>
                </div>
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-[8px] bg-surface-inset border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-ink block">{p.title}</span>
                      <span className="text-ink-muted font-mono mt-0.5 block">{p.githubRepo}</span>
                    </div>
                    <Link
                      href={`/client`}
                      className="text-xs font-semibold text-[#ff385c] hover:underline"
                    >
                      View Audits &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-[8px] bg-surface-inset border border-border text-xs text-ink-muted">
                No projects assigned to your email ({session.email}) yet. When your freelancer initializes a project and invites this address, it will automatically appear here.
              </div>
            )}
          </div>

          {/* Data Rights & Privacy Controls */}
          <div className="p-6 rounded-[14px] border border-border bg-surface-raised airbnb-shadow-hover">
            <div className="pb-4 mb-4 border-b border-border-soft">
              <h3 className="text-base font-semibold text-ink">
                Data Management &amp; Privacy Rights
              </h3>
              <p className="text-xs text-ink-muted">
                Export your project audits or request account deletion
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[8px] bg-surface-inset border border-border">
                <div>
                  <span className="text-sm font-semibold text-ink block">
                    Export My Audit Data
                  </span>
                  <span className="text-xs text-ink-muted">
                    Download a comprehensive JSON archive of all your verification audits and scope logs.
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
                    Delete Account &amp; Data
                  </span>
                  <span className="text-xs text-ink-muted">
                    Permanently delete your profile and unlink your projects from this portal.
                  </span>
                </div>
                <DeleteAccountButton
                  label="Delete Account"
                  confirmMessage="Are you sure you want to delete your account? This action cannot be undone."
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-ink-muted">
        CommitCheck &bull; Meeting-to-Code Freelance Verification Platform
      </footer>
    </div>
  );
}
