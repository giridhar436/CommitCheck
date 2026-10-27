import Link from "next/link";
import Image from "next/image";
import { ShieldX, ArrowRight, Home, LogOut } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string; role?: string; from?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;

  const currentRole = session?.role || params.role || "UNKNOWN";
  const requiredRole = params.required || (currentRole === "CLIENT" ? "FREELANCER" : "CLIENT");

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-[#dddddd] bg-white">
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#ff385c] rounded-[8px] p-1"
            aria-label="CommitCheck Home"
          >
            <Image
              src="/branding/logo-180x48.svg"
              alt="CommitCheck"
              width={180}
              height={48}
              className="h-8 w-auto"
              priority
            />
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#fff8f6] text-[#c13515] border border-[#fbd5cb]">
              Access Restricted
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#dddddd] text-[#222222] hover:bg-[#f7f7f7] transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-[#fff8f6] text-[#c13515] border border-[#fbd5cb] flex items-center justify-center mb-6 air占い-shadow airbnb-shadow">
          <ShieldX className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#fff8f6] text-[#c13515] border border-[#fbd5cb] mb-3">
          Error 403 &bull; Permission Denied
        </span>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#222222] mb-3">
          Role-Gated Workspace Access
        </h1>

        <p className="text-sm text-[#6a6a6a] max-w-md mb-6 leading-relaxed">
          This area is strictly restricted to authenticated <strong>{requiredRole}</strong> accounts.
          {session ? (
            <span> You are currently signed in as <strong>{session.email}</strong> ({currentRole}).</span>
          ) : (
            <span> You must sign in with an authorized account to continue.</span>
          )}
        </p>

        {/* Role Explanation Card */}
        <div className="w-full text-left p-5 rounded-[14px] bg-[#f7f7f7] border border-[#dddddd] mb-8 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6a]">
            Architecture Boundary (ADR 0001)
          </div>
          <p className="text-xs text-[#3f3f3f] leading-relaxed">
            CommitCheck strictly partitions permissions by OAuth provider to protect project security:
          </p>
          <ul className="text-xs text-[#3f3f3f] space-y-1 list-disc list-inside">
            <li><strong>Freelancers</strong> authenticate via GitHub OAuth to bind repositories and sync Linear tasks.</li>
            <li><strong>Clients</strong> authenticate via Google OAuth to audit deliverable commits and approve scope.</li>
          </ul>
        </div>

        {/* Recovery Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          {session ? (
            <>
              <Link
                href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
              >
                Go to My {session.role === "FREELANCER" ? "Freelancer" : "Client"} Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="/api/auth/logout"
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all"
              >
                <LogOut className="w-4 h-4 text-[#6a6a6a]" />
                Switch Account
              </a>
            </>
          ) : (
            <>
              <a
                href={requiredRole === "FREELANCER" ? "/api/auth/github" : "/api/auth/google"}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[#ff385c] hover:bg-[#e00b41] text-white font-medium text-sm transition-all shadow-sm"
              >
                Sign In as {requiredRole}
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] font-medium text-sm transition-all"
              >
                <Home className="w-4 h-4 text-[#6a6a6a]" />
                Home
              </Link>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dddddd] py-6 text-center text-xs text-[#6a6a6a]">
        CommitCheck &bull; Meeting-to-Code Verification Platform
      </footer>
    </div>
  );
}
