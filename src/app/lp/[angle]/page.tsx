import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing, type LandingAngle } from "@/components/landing/landing";

/** One landing page per ad angle; the home page carries the max-offer angle. */
const PAGES: Record<Exclude<LandingAngle, "max-offer">, { title: string; description: string }> = {
  rental: {
    title: "Rental property calculator",
    description:
      "Cash flow, cap rate, cash-on-cash and DSCR for a rental, with every expense line and formula shown — and the max price that meets your goals.",
  },
  comps: {
    title: "Comps & ARV you can defend",
    description: "Every comparable sale on a map with dollar adjustments for size, beds, baths and age — an ARV you can show your lender.",
  },
  brrrr: {
    title: "BRRRR calculator: cash left in the deal",
    description: "Model hard money, rehab, holding costs and the cash-out refinance to see how much cash stays in the deal.",
  },
  adu: {
    title: "ADU calculator: cost, rent and equity",
    description: "See what a backyard ADU costs to build, what it rents for, the cash flow and the equity it adds.",
  },
  stress: {
    title: "Rental stress test",
    description: "See whether a rental still cash flows if rent drops, rates rise or repairs run high — one at a time and all at once.",
  },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PAGES).map((angle) => ({ angle }));
}

export async function generateMetadata({ params }: { params: Promise<{ angle: string }> }): Promise<Metadata> {
  const { angle } = await params;
  const page = PAGES[angle as keyof typeof PAGES];
  if (!page) return {};
  return {
    title: { absolute: `${page.title} — DEALAN` },
    description: page.description,
    alternates: { canonical: `/lp/${angle}` },
    openGraph: { title: `${page.title} — DEALAN`, description: page.description, url: `/lp/${angle}` },
  };
}

export default async function AngleLandingPage({ params }: { params: Promise<{ angle: string }> }) {
  const { angle } = await params;
  if (!(angle in PAGES)) notFound();
  return <Landing angle={angle as LandingAngle} />;
}
