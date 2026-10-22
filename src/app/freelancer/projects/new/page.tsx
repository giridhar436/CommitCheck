"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitBranch, ShieldCheck, Check, AlertCircle, Loader2 } from "lucide-react";

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  description: string | null;
}

export default function NewProjectPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [githubRepoFullName, setGithubRepoFullName] = useState("");

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/github/repos");
        if (res.ok) {
          const data = await res.json();
          setRepos(data.repositories || []);
          if (data.repositories?.length > 0) {
            setGithubRepoFullName(data.repositories[0].fullName);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingRepos(false);
      }
    }
    fetchRepos();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          clientEmail,
          githubRepoFullName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      router.push("/freelancer");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Main Form Body */}
      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
            Project Initialization
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18181b] mt-1 mb-2">
            Create a New Client Project
          </h1>
          <p className="text-sm text-[#71717a] leading-relaxed">
            Bind an authorized GitHub repository and define client details. Once created, you can dispatch meeting bots, stage deliverables, and track verified commits.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-[10px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to create project</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[14px] border border-[#e4e4e7] p-8 md:p-10 saas-card-shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-2">
                Project Title <span className="text-[#ff385c]">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                placeholder="e.g. Fintech Mobile App Redesign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#e4e4e7] bg-white text-sm text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-2">
                Scope Summary / Description
              </label>
              <textarea
                id="description"
                rows={3}
                placeholder="Brief summary of agreed deliverables, milestones, and tech stack..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3.5 rounded-[8px] border border-[#e4e4e7] bg-white text-sm text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
              />
            </div>

            {/* Client Email */}
            <div>
              <label htmlFor="clientEmail" className="block text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-2">
                Client Contact Email <span className="text-[#ff385c]">*</span>
              </label>
              <input
                id="clientEmail"
                type="email"
                required
                placeholder="client@company.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-[8px] border border-[#e4e4e7] bg-white text-sm text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
              />
              <p className="text-xs text-[#71717a] mt-1.5">
                Used to grant executive audit dashboard access to your client upon Google OAuth login.
              </p>
            </div>

            {/* GitHub Repository Binding */}
            <div className="pt-4 border-t border-[#e4e4e7]">
              <label htmlFor="githubRepo" className="block text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-2">
                Authorized GitHub Repository <span className="text-[#ff385c]">*</span>
              </label>

              {loadingRepos ? (
                <div className="flex items-center gap-2 h-11 px-3.5 rounded-[8px] border border-[#e4e4e7] bg-[#f4f4f5] text-xs text-[#71717a]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#ff385c]" />
                  Loading your accessible repositories...
                </div>
              ) : repos.length > 0 ? (
                <div className="space-y-3">
                  <select
                    id="githubRepo"
                    value={githubRepoFullName}
                    onChange={(e) => setGithubRepoFullName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-[8px] border border-[#e4e4e7] bg-white text-sm text-[#18181b] focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.fullName}>
                        {r.fullName} {r.isPrivate ? "(Private)" : "(Public)"}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 text-xs text-[#71717a]">
                    <GitBranch className="w-3.5 h-3.5 text-[#18181b]" />
                    <span>
                      Selected repository: <strong className="text-[#18181b]">{githubRepoFullName}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  id="githubRepoManual"
                  type="text"
                  required
                  placeholder="owner/repository-name"
                  value={githubRepoFullName}
                  onChange={(e) => setGithubRepoFullName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[8px] border border-[#e4e4e7] bg-white text-sm text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-[#ff385c]/20 focus:border-[#ff385c] transition-all"
                />
              )}
              <p className="text-xs text-[#71717a] mt-1.5">
                Must be formatted as <code className="bg-[#f4f4f5] px-1.5 py-0.5 rounded text-[#18181b] border border-[#e4e4e7]">owner/repo</code>. The verification engine audits commits against this repository.
              </p>
            </div>

            {/* Form Actions */}
            <div className="pt-6 border-t border-[#e4e4e7] flex items-center justify-end gap-3">
              <Link
                href="/freelancer"
                className="px-5 py-2.5 rounded-[8px] border border-[#e4e4e7] text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-semibold text-xs transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
