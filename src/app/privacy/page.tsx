import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — DEALAN",
  description: "What DEALAN collects, why, who it's shared with, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          DEALAN (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a rental property analysis tool for real estate investors in the United States. This policy
          explains what we collect when you use DEALAN and its website, why, who we share it with, and the choices you have. We don&apos;t sell
          your personal information.
        </p>
      }
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong className="text-foreground">Account details:</strong> your name, email address and password. We store only a one-way hash of
            your password, never the password itself.
          </li>
          <li>
            <strong className="text-foreground">What you enter:</strong> deals and their addresses, prices, financing, rents, expenses, notes,
            goals, and your settings. This is the content of your account.
          </li>
          <li>
            <strong className="text-foreground">Property data you look up:</strong> when you look up an address, we save the returned property
            facts, estimates and comparable properties with your deal, and keep a shared cache of each lookup for up to 30 days so the same address
            doesn&apos;t have to be fetched again. We log which account made each new lookup, to enforce usage limits.
          </li>
          <li>
            <strong className="text-foreground">Technical data:</strong> like any website, our hosting provider receives your IP address, browser
            type and the pages requested, in server logs used for security and troubleshooting.
          </li>
        </ul>
        <p>We don&apos;t ask for and you shouldn&apos;t enter Social Security numbers, bank account numbers or other sensitive financial identifiers.</p>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run your account and show your analyses, reports and comparisons.</li>
          <li>To fetch property data and estimates for the addresses you look up.</li>
          <li>To keep the service secure, prevent abuse, and enforce lookup limits.</li>
          <li>To answer you when you contact us, and to send essential service messages (for example about your account or changes to these terms).</li>
          <li>To understand, in aggregate, how the product is used so we can improve it.</li>
        </ul>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p>We share information only with service providers that help us run DEALAN, and only what each needs:</p>
        <ul>
          <li>
            <strong className="text-foreground">Hosting and database providers</strong> store and serve the app and your account data.
          </li>
          <li>
            <strong className="text-foreground">RentCast</strong> receives the addresses you look up and returns property records, value and rent
            estimates, and comparable properties.
          </li>
          <li>
            <strong className="text-foreground">U.S. Census Bureau geocoder</strong> receives addresses of comparable properties to place them on
            the map.
          </li>
          <li>
            <strong className="text-foreground">Address suggestion services</strong> (Photon by Komoot, and Geoapify when enabled) receive the
            partial address you type in the search box.
          </li>
          <li>
            <strong className="text-foreground">Map tile providers</strong> are contacted by your browser to draw maps, and see your IP address and
            the map area shown.
          </li>
          <li>
            <strong className="text-foreground">Google Street View</strong>, when enabled, receives the address or coordinates of a property to
            return a photo. Requests go through our server, not directly from your browser.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, to protect the rights and safety of our users or others, or as part of a merger or
          sale of the business, in which case this policy continues to apply.
        </p>
        <p>We do not sell your personal information or share it for cross-context behavioral advertising.</p>
      </section>

      <section>
        <h2>Cookies and similar technologies</h2>
        <ul>
          <li>
            <strong className="text-foreground">Sign-in cookies</strong> keep you signed in and protect forms from cross-site requests. They&apos;re
            required for the service to work.
          </li>
          <li>
            <strong className="text-foreground">Your browser&apos;s local storage</strong> remembers preferences such as light or dark mode.
          </li>
        </ul>
        <p>
          We don&apos;t currently use analytics or advertising cookies. If we add them, we&apos;ll update this policy first and describe the choices
          available to you.
        </p>
      </section>

      <section>
        <h2>The demo</h2>
        <p>
          &ldquo;Try the demo&rdquo; creates a private, temporary account with sample deals that only you can see. Address lookups in the demo use
          synthetic sample data. Demo accounts and everything in them are deleted automatically after 3 days, unless you sign up from inside the demo,
          in which case they become your account.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <ul>
          <li>Account content is kept until you delete it or delete your account.</li>
          <li>Cached property lookups are kept for up to 30 days, and lookup usage records for as long as needed to enforce limits.</li>
          <li>Server logs are kept by our hosting provider for a limited period under its own retention settings.</li>
        </ul>
        <p>When you delete your account, we delete your profile, deals, settings and lookup records. Backups are overwritten on their normal cycle.</p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <ul>
          <li>
            <strong className="text-foreground">See and correct</strong> your information by editing your profile and deals in the app.
          </li>
          <li>
            <strong className="text-foreground">Export</strong> your saved deals from My Properties as a CSV file.
          </li>
          <li>
            <strong className="text-foreground">Delete</strong> your account and its data at any time from{" "}
            <Link href="/settings" className="font-medium text-foreground underline underline-offset-2">
              Settings
            </Link>
            .
          </li>
        </ul>
        <p>
          Depending on where you live (for example California), you may have rights to know, access, correct and delete your personal information,
          and not to be discriminated against for using them. To make a request we can&apos;t handle in the app, <ContactLine />. We&apos;ll verify
          the request comes from the account holder before acting on it.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Connections use HTTPS, passwords are hashed, and each account can see only its own data. No system is perfectly secure; if we learn of a
          breach affecting your information we&apos;ll notify you as the law requires.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>DEALAN is for adults. It isn&apos;t directed to anyone under 18, and we don&apos;t knowingly collect information from children.</p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If we change this policy we&apos;ll update the date above, and for material changes we&apos;ll tell you in the app or by email before they
          take effect. Questions? <ContactLine />.
        </p>
      </section>
    </LegalPage>
  );
}
