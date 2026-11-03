"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky "jump to" bar for long pages. Highlights the section in view. */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((i) => i.id).join(",");
  useEffect(() => {
    const els = ids.split(",").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    // At the very bottom the last sections can't reach the top of the screen — highlight the last one.
    const last = els.at(-1);
    const onScroll = () => {
      if (last && innerHeight + scrollY >= document.documentElement.scrollHeight - 4) setActive(last.id);
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
    };
  }, [ids]);
  return (
    <nav aria-label="Sections" className="no-print sticky top-14 z-20 -mx-4 overflow-x-auto border-b bg-background/90 px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8">
      <ul className="flex w-max gap-1">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              onClick={() => setActive(i.id)}
              className={cn(
                "block rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active === i.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
