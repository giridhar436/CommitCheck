import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Cookie, CheckCircle2 } from "lucide-react";

export default function CookiePolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <Cookie className="w-3.5 h-3.5 text-[#ff385c]" />
            Browser Storage & Security
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Cookie Policy
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Version 1.0 (Strictly Necessary Session Storage)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f3f3f] leading-relaxed">
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. What Are Cookies?
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              Cookies are small pieces of text stored on your browser when you visit a website. They allow websites to remember your device, keep you signed into authenticated sessions, and protect against security threats like cross-site request forgery.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Verified Cookie Inventory
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              CommitCheck operates strictly on an essential-only cookie model. We use zero non-essential advertising or cross-site marketing cookies.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-[#dddddd] rounded-[8px] overflow-hidden">
                <thead className="bg-[#f7f7f7] text-[#222222] border-b border-[#dddddd]">
                  <tr>
                    <th className="p-3 font-semibold">Cookie Name</th>
                    <th className="p-3 font-semibold">Classification</th>
                    <th className="p-3 font-semibold">Duration</th>
                    <th className="p-3 font-semibold">Purpose & Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dddddd] bg-white text-[#3f3f3f]">
                  <tr>
                    <td className="p-3 font-mono text-[#222222] font-semibold">cc_session</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Strictly Necessary
                      </span>
                    </td>
                    <td className="p-3">7 Days</td>
                    <td className="p-3 leading-relaxed">
                      Stores an HMAC-SHA256 cryptographically signed session token identifying the authenticated user ID and role (`FREELANCER` or `CLIENT`). Configured with <code>HttpOnly</code> (prevents client-side script theft) and <code>SameSite=Lax</code> (protects against CSRF).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Absence of Third-Party Advertising & Profiling Trackers
            </h2>
            <div className="flex items-start gap-3 p-4 rounded-[10px] bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold">Zero Third-Party Advertising Beacons</p>
                <p className="mt-0.5 text-emerald-800 leading-relaxed">
                  We do not bundle Facebook Pixel, Google AdSense, Twitter conversion pixels, or analytics trackers in our source bundles. Your browsing patterns and project verification activities are never sold or shared with advertiser networks.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              4. How to Control or Delete Cookies
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              Because <code>cc_session</code> is strictly necessary to identify your authenticated account across API routes and middleware route guards, disabling it will prevent you from signing in. You can clear existing cookies at any time via your browser settings or by clicking &ldquo;Sign out&rdquo; in the application navigation.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
