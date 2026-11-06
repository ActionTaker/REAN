"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Shown to a demo visitor right after they save their first own deal: keep it by signing up. */
export function GuestKeepPrompt({ timeLeft }: { timeLeft: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const close = (o: boolean) => {
    setOpen(o);
    if (!o) router.replace(pathname, { scroll: false }); // drop ?kept=0 so it doesn't come back on refresh
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="size-5" /> Keep this deal
          </DialogTitle>
          <DialogDescription>
            You&apos;re in a private demo, which is deleted in {timeLeft}. Create a free account — just an email and a password — and this deal and
            everything else you&apos;ve made here stays yours.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => close(false)}>
            Keep exploring
          </Button>
          <Button asChild>
            <Link href="/register">Create free account</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
