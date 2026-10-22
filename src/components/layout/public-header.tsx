import Link from "next/link";
import { ShieldCheck, GitBranch, ArrowRight } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";

export async function PublicHeader() {
  const session = await getCurrentSession();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#dddddd]">
      <div className="max-w-[1280px] mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#ff385c] rounded-[8px] p-1">
          <div className="w-10 h-10 rounded-full bg-[#ff385c] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight text-[#222222]">CommitCheck</span>
            <span className="text-[11px] font-medium text-[#6a6a6a] tracking-wider uppercase -mt-1">
              Meeting-to-Code Verification
            </span>
          </div>
        </Link>

        <nav aria-label="Main Navigation" className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/docs"
            className="hidden md:inline-block text-sm font-medium text-[#6a6a6a] hover:text-[#222222] transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/support"
            className="hidden md:inline-block text-sm font-medium text-[#6a6a6a] hover:text-[#222222] transition-colors"
          >
            Support
          </Link>

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
                className="px-3 py-2 text-sm text-[#6a6a6a] hover:text-[#222222] transition-colors"
              >
                Sign out
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#222222] bg-[#f7f7f7] hover:bg-[#ebebeb] rounded-[8px] border border-[#dddddd] transition-all focus:outline-none focus:ring-2 focus:ring-[#222222]"
              >
                Sign In
              </Link>
              <a
                href="/api/auth/github"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#222222] hover:bg-black rounded-[8px] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <GitBranch className="w-3.5 h-3.5" />
                Freelancer
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
