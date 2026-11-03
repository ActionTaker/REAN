import Link from "next/link";
import { BrandIcon } from "./nav";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <BrandIcon className="size-4" />
      </span>
      <span className="text-[15px]">DEALAN</span>
    </Link>
  );
}
