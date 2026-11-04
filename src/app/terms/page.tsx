import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — DEALAN",
  description: "The terms for using DEALAN, including that its analyses are estimates and not investment advice.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms govern your use of DEALAN, a rental property analysis tool. By creating an account, starting the demo or otherwise using
          DEALAN, you agree to them. If you don&apos;t agree, please don&apos;t use the service.
        </p>
      }
    >
      <section>
        <h2>1. Not investment, financial, tax or legal advice</h2>
        <p>
          DEALAN does arithmetic on the assumptions you enter and on third-party estimates, and shows how each figure is calculated. Its results —
          including cash flow, returns, after-repair values, rents, maximum offer prices, ADU values and tax estimates — are estimates, not
          predictions or guarantees of future performance.
        </p>
        <p>
          DEALAN is not a broker, appraiser, lender, financial adviser, tax adviser or law firm, and nothing in it is a recommendation to buy, sell,
          finance or build any property. You are responsible for your own decisions. Verify every input and estimate with qualified professionals —
          such as an agent, appraiser, inspector, contractor, lender, CPA or attorney — before you rely on it.
        </p>
      </section>

      <section>
        <h2>2. Third-party data</h2>
        <p>
          Property records, value and rent estimates, comparable properties, maps, photos and state averages come from third parties and public
          sources. They can be incomplete, out of date or wrong, and listing prices may not reflect what a property actually sold or rented for. We
          don&apos;t warrant their accuracy. Data you receive through DEALAN is for your own analysis; don&apos;t resell it or republish it in bulk.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>You must be at least 18 and able to form a binding contract.</li>
          <li>Give accurate sign-up information and keep your password secure. You&apos;re responsible for activity under your account.</li>
          <li>Tell us promptly if you believe your account has been accessed without permission.</li>
          <li>Demo accounts are temporary and are deleted after 3 days unless you sign up from inside the demo.</li>
        </ul>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          The deals, notes and other information you enter remain yours. You give us permission to store, process and display them only as needed
          to provide DEALAN to you. You can export your saved deals and delete your account at any time from the app. Our{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          explains how we handle personal information.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>Don&apos;t:</p>
        <ul>
          <li>Use DEALAN for anything unlawful, including discrimination in housing.</li>
          <li>Scrape, crawl or bulk-download the service or its data, or try to get around usage limits such as address-lookup quotas.</li>
          <li>Interfere with or overload the service, probe it for vulnerabilities without permission, or access other people&apos;s accounts.</li>
          <li>Copy, resell or reverse-engineer the service, except where the law allows despite this restriction.</li>
        </ul>
        <p>We may limit, suspend or close accounts that break these rules.</p>
      </section>

      <section>
        <h2>6. Price and changes to the service</h2>
        <p>
          DEALAN is currently free during early access. We may introduce paid plans; we&apos;ll tell you before any charge applies, and you won&apos;t
          be billed without agreeing to a plan. We may add, change or remove features, set usage limits, or stop offering the service. If we shut it
          down, we&apos;ll give reasonable notice so you can export your data.
        </p>
      </section>

      <section>
        <h2>7. Disclaimer of warranties</h2>
        <p>
          DEALAN is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the fullest extent the law allows, we disclaim all warranties,
          express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement, and we don&apos;t promise
          that the service will be uninterrupted or error-free.
        </p>
      </section>

      <section>
        <h2>8. Limitation of liability</h2>
        <p>
          To the fullest extent the law allows, DEALAN and its operators won&apos;t be liable for any indirect, incidental, special, consequential or
          punitive damages, or for lost profits, lost investment returns, or losses from any property purchase, sale, financing or construction
          decision, even if advised of the possibility. Our total liability for any claim relating to the service is limited to the greater of the
          amount you paid us in the 12 months before the claim or US$50.
        </p>
        <p>Some jurisdictions don&apos;t allow these limits, so some of them may not apply to you.</p>
      </section>

      <section>
        <h2>9. Ending your use</h2>
        <p>
          You can stop using DEALAN and delete your account at any time. We may suspend or end your access if you break these terms or if we
          discontinue the service. Sections 1, 2, 7, 8 and 10 continue to apply after your use ends.
        </p>
      </section>

      <section>
        <h2>10. General</h2>
        <p>
          These terms and the Privacy Policy are the whole agreement between you and us about DEALAN. If a part is found unenforceable, the rest
          still applies. Not enforcing a term isn&apos;t a waiver of it. We may update these terms; we&apos;ll change the date above and, for material
          changes, notify you in the app or by email before they take effect. Continuing to use DEALAN after that means you accept the updated terms.
        </p>
        <p>
          Questions about these terms? <ContactLine />.
        </p>
      </section>
    </LegalPage>
  );
}
