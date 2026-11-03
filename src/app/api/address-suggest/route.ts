import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { suggestAddresses } from "@/lib/property-data/address-suggest";

/** GET /api/address-suggest?q=4218 N Grace → up to 6 U.S. street-address suggestions. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 4) return NextResponse.json({ suggestions: [] });
  try {
    return NextResponse.json({ suggestions: await suggestAddresses(q) });
  } catch {
    // Suggestions are a convenience; typing a full address still works.
    return NextResponse.json({ suggestions: [] });
  }
}
