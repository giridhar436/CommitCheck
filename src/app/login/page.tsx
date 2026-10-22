import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import {
  ShieldCheck,
  GitBranch,
  ArrowRight,
  Clock,
  AlertTriangle,
  Lock,
  Sparkles,
} from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    auth?: string;
    role?: string;
    reason?: string;
    redirect?: string;
  }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;

  // Safe redirect if already authenticated
  if (session && !params.reason) {
    if (params.redirect && params.redirect.startsWith("/")) {
      redirect(params.redirect);
    }
    redirect(session.role === "FREELANCER" ? "/freelancer" : "/client");
  }

  const isSessionExpired = params.reason === "session_expired" || params.reason === "expired";
  const returnUrl = params.redirect && params.redirect.startsWith("/") ? params.redirect : "";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-[#dddddd] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
              <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
                Meeting-to-Code Verification
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Login Body */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16 w-full flex-1 flex flex-col items-center justify-center">
        {/* Session Expired Banner */}
        {isSessionExpired && (
          <div className="w-full max-w-xl mb-8 p-4 rounded-[14px] bg-[#fff8e6] border border-[#fde68a] flex items-start gap-3 text-sm text-[#78350f] airbnb-shadow">
            <Clock className="w-5 h-5 shrink-0 text-[#b45309] mt-0.5" />
            <div>
              <p className="font-semibold">Your session has expired</p>
              <p className="text-xs text-[#92400e] mt-0.5">
                For security reasons, session tokens expire after 7 days of inactivity. Please re-authenticate with your provider to continue.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {params.error && (
          <div className="w-full max-w-xl mb-8 p-4 rounded-[14px] bg-[#fff8f6] border border-[#fbd5cb] flex items-start gap-3 text-sm text-[#c13515] airbnb-shadow">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Notice</p>
              <p className="text-xs mt-0.5">{params.error}</p>
            </div>
          </div>
        )}

        {/* Auth Required Notice */}
        {params.auth === "required" && (
          <div className="w-full max-w-xl mb-8 p-4 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd] flex items-start gap-3 text-sm text-[#222222] airbnb-shadow">
            <Lock className="w-5 h-5 shrink-0 text-[#6a6a6a] mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Required</p>
              <p className="text-xs text-[#6a6a6a] mt-0.5">
                {params.role ? (
                  <span>Please sign in as a <strong>{params.role}</strong> to access that workspace.</span>
                ) : (
                  <span>Please sign in to access your CommitCheck projects and audits.</span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="text-center max-w-xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#ff385c]" />
            Provider-Enforced Role Security (ADR 0001)
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#222222] mb-2">
            Sign In to CommitCheck
          </h1>
          <p className="text-sm text-[#6a6a6a] leading-relaxed">
            Choose your role gateway below. Freelancers authenticate via GitHub for repository mapping; Clients authenticate via Google for frictionless audit sign-off.
          </p>
        </div>

        {/* Dual Role Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Freelancer Gateway */}
          <div className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#222222]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
                  For Freelancers
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#f7f7f7] text-[#222222] border border-[#dddddd]">
                  Developer Flow
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#222222] mb-2">
                Sign in with GitHub
              </h2>
              <p className="text-xs text-[#6a6a6a] mb-6 leading-relaxed">
                Connects your developer identity, enables read access to bind repositories, and powers automated scope staging and Linear publishing.
              </p>
            </div>

            <div>
              <a
                href={`/api/auth/github${returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : ""}`}
                className="w-full flex items-center justify-center gap-2.5 h-12 px-6 rounded-[8px] bg-[#222222] text-white hover:bg-black font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                <GitBranch className="w-4 h-4" />
                Continue with GitHub
              </a>
              <p className="text-[11px] text-[#6a6a6a] text-center mt-3">
                Requests repo read and user:email scopes only.
              </p>
            </div>
          </div>

          {/* Client Gateway */}
          <div className="p-8 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow-hover flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff385c]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ff385c]">
                  For Clients
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-[#fff0f3] text-[#ff385c] border border-[#ffd1da]">
                  Executive Audit
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#222222] mb-2">
                Sign in with Google
              </h2>
              <p className="text-xs text-[#6a6a6a] mb-6 leading-relaxed">
                One-click authentication for clients and product owners to review deliverables, inspect code audits, and sign off on milestone scope.
              </p>
            </div>

            <div>
              <a
                href={`/api/auth/google${returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : ""}`}
                className="w-full flex items-center justify-center gap-2.5 h-12 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
              >
                Continue with Google
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-[11px] text-[#6a6a6a] text-center mt-3">
                Zero passwords required &bull; Instant access
              </p>
            </div>
          </div>
        </div>

        {/* Security & Privacy Commitment */}
        <div className="mt-12 text-center text-xs text-[#6a6a6a] max-w-md">
          By signing in, you agree to CommitCheck&apos;s{" "}
          <Link href="/terms" className="text-[#222222] underline hover:text-[#ff385c]">
            Terms of Service
          </Link>{" "}
          and acknowledge our{" "}
          <Link href="/privacy" className="text-[#222222] underline hover:text-[#ff385c]">
            Privacy Policy
          </Link>
          .
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] py-6 text-center text-xs text-[#6a6a6a]">
        CommitCheck &bull; Meeting-to-Code Freelance Verification Platform
      </footer>
    </div>
  );
}
