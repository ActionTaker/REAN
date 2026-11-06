import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { demoTimeLeft } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2.5 pb-6">
          <Brand />
        </div>
        <SidebarNav />
        <div className="mt-auto rounded-lg border bg-card p-3 text-xs">
          <p className="font-medium">Free plan</p>
          <p className="mt-0.5 text-muted-foreground">Unlimited Buy & Hold, BRRRR and Flip analyses.</p>
        </div>
        <nav className="mt-3 flex gap-3 px-2.5 text-[11px] text-muted-foreground" aria-label="Legal">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur lg:px-8">
          <MobileNav />
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {user.isGuest && (
              <Button size="sm" asChild>
                <Link href="/register">Save my work — sign up free</Link>
              </Button>
            )}
            <UserMenu name={user.name} email={user.isGuest ? "Private demo" : user.email} />
          </div>
        </header>
        {user.isGuest && (
          <div className="no-print border-b bg-muted/60 px-4 py-2 text-center text-xs text-muted-foreground lg:px-8">
            You&apos;re in a private demo — nobody else sees it. It&apos;s deleted in{" "}
            <span className="font-medium text-foreground">{demoTimeLeft(user.createdAt)}</span> unless you sign up, which keeps everything you&apos;ve
            made. Address lookups here use sample data.
          </div>
        )}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
