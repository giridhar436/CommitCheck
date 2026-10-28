import Link from "next/link";
import Image from "next/image";
import { GitBranch, ArrowRight } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function PublicHeader() {
  const session = await getCurrentSession();

  return (
    <header className="sticky top-0 z-50 bg-canvas/90 backdrop-blur-md border-b border-border">
      <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center group focus:outline-none focus:ring-2 focus:ring-[#ff385c] rounded-[8px] p-1"
          aria-label="CommitCheck Home"
        >
          <Image
            src="/branding/logo-180x48.svg"
            alt="CommitCheck - Meeting-to-Code Verification"
            width={180}
            height={48}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav aria-label="Main Navigation" className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/docs"
            className="hidden md:inline-block text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/support"
            className="hidden md:inline-block text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Support
          </Link>

          <ThemeToggle />

          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href={session.role === "FREELANCER" ? "/freelancer" : "/client"}
                className="px-4 py-2 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c] focus:ring-offset-2"
              >
                Dashboard
              </Link>
              <a
                href="/api/auth/logout"
                className="px-3 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Sign out
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <a
                href="/api/auth/github"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-ink bg-surface-raised hover:bg-surface-inset rounded-[8px] border border-border transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-ink"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Freelancer Login
              </a>
              <a
                href="/api/auth/google"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#ff385c] hover:bg-[#e00b41] rounded-[8px] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff385c]"
              >
                Client Portal
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
