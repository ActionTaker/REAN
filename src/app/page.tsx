import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "DEALAN — Know your max offer before you call" },
  description:
    "Rental property analysis for U.S. investors: comps with every adjustment shown, your max offer price from your own goals, BRRRR, flips and ADUs. Free during early access.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <Landing />;
}
