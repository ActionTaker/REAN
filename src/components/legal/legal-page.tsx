import Link from "next/link";
import { Brand } from "@/components/shell/brand";

/** Effective date shown on both legal pages. Update it whenever either page changes. */
export const LEGAL_EFFECTIVE_DATE = "November 5, 2026";

/** Where people send privacy and account requests. Set CONTACT_EMAIL in the environment. */
export function contactEmail(): string | null {
  return process.env.CONTACT_EMAIL?.trim() || null;
}

/** Shared frame for the Privacy Policy and Terms of Service. */
export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Brand href="/" />
          <nav className="flex gap-4 text-sm text-muted-foreground" aria-label="Legal">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className="mt-6 text-pretty text-muted-foreground">{intro}</div>
        <div className="mt-10 space-y-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_section>p:first-of-type]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 text-[15px] leading-relaxed">
          {children}
        </div>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

/** "email us at X" when a contact address is configured, otherwise the in-app route. */
export function ContactLine() {
  const email = contactEmail();
  return email ? (
    <>
      email us at{" "}
      <a href={`mailto:${email}`} className="font-medium text-foreground underline underline-offset-2">
        {email}
      </a>
    </>
  ) : (
    <>use Settings in your account, or the contact details on this site</>
  );
}
