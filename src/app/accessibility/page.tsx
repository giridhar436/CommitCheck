import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Eye } from "lucide-react";

export default function AccessibilityStatementPage() {
  const lastUpdated = "October 2026";

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between selection:bg-[#ff385c] selection:text-white">
      <PublicHeader />

      <main className="max-w-[900px] mx-auto px-6 py-12 md:py-16 w-full flex-1">
        {/* Header */}
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f7f7f7] border border-[#dddddd] text-xs font-semibold text-[#222222] mb-3">
            <Eye className="w-3.5 h-3.5 text-[#ff385c]" />
            Inclusion & Usability Commitment
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#222222] mb-2">
            Accessibility Statement
          </h1>
          <p className="text-xs text-[#6a6a6a]">
            Effective Date: {lastUpdated} &bull; Design System Specification: Airbnb Standard (DESIGN.md)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f3f3f] leading-relaxed">
          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-[#f7f7f7]">
            <h2 className="text-base font-semibold text-[#222222] mb-2">
              1. Our Accessibility Commitment
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              CommitCheck is committed to ensuring digital accessibility for software engineers, clients, product managers, and auditors of all abilities. We design our web interfaces in accordance with established accessibility best practices and continuously refine keyboard navigability, screen reader semantics, and color contrast.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              2. Design System & Implementation Measures
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              Our user interface incorporates the following verified architectural measures:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">Semantic Page Structure</strong>
                <p className="text-[#6a6a6a]">
                  Pages utilize standard HTML5 landmark elements (<code>&lt;header&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code>, <code>&lt;nav&gt;</code>) and maintain a strictly ordered heading hierarchy (<code>&lt;h1&gt;</code> to <code>&lt;h3&gt;</code>).
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">High-Contrast Palette</strong>
                <p className="text-[#6a6a6a]">
                  Text uses deep ink (<code>#222222</code>) over pure white canvas (<code>#ffffff</code>), providing a contrast ratio exceeding 15:1. Primary accents use Airbnb Rausch (<code>#ff385c</code>) with high-visibility white text.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">Keyboard Navigation & Focus Rings</strong>
                <p className="text-[#6a6a6a]">
                  Interactive elements—including buttons, project cards, and links—feature visible focus rings (<code>focus:ring-2 focus:ring-[#ff385c]</code>) and can be fully activated via Tab and Enter/Space keys.
                </p>
              </div>

              <div className="p-4 rounded-[10px] border border-[#dddddd] bg-white">
                <strong className="text-[#222222] block mb-1">Non-Color Error Indicators</strong>
                <p className="text-[#6a6a6a]">
                  System states, warnings, and Ghost Completion discrepancy alerts pair semantic color borders with distinctive icons (such as AlertTriangle and ShieldAlert) so information is never conveyed by color alone.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[#222222] border-b border-[#dddddd] pb-2">
              3. Ongoing Evaluation Notice
            </h2>
            <p className="text-xs text-[#3f3f3f]">
              While CommitCheck strives to adhere to WCAG 2.1 Level AA recommendations across its core dashboard and verification views, we do not make an unqualified claim of 100% full compliance pending formal third-party accessibility certification. We actively evaluate automated axe-core test passes and welcome direct user feedback.
            </p>
          </section>

          <section className="p-6 rounded-[14px] border border-[#dddddd] bg-white airbnb-shadow space-y-2">
            <h2 className="text-base font-semibold text-[#222222]">
              4. Accessibility Feedback & Assistance
            </h2>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              If you encounter an accessibility barrier or require assistance navigating a project audit or scope staging board, please email us at{" "}
              <a href="mailto:accessibility@commitcheck.dev" className="text-[#ff385c] font-medium underline">
                accessibility@commitcheck.dev
              </a>
              . We welcome your input and will work to address barriers promptly.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
