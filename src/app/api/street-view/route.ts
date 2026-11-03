import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * GET /api/street-view?location=<address or "lat,lng">&w=640&h=360
 * Proxies Google Street View Static so the API key stays on the server.
 * Checks the (free, no-quota) metadata endpoint first, so addresses with no
 * imagery cost nothing and get a clear reason instead of a grey placeholder.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ reason: "unauthorized" }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ reason: "not_configured" });

  const location = (req.nextUrl.searchParams.get("location") ?? "").trim().slice(0, 200);
  if (location.length < 5) return NextResponse.json({ reason: "invalid" }, { status: 400 });
  const clamp = (v: string | null, d: number) => Math.min(640, Math.max(100, Number(v) || d)); // 640 = API max per side
  const w = clamp(req.nextUrl.searchParams.get("w"), 640);
  const h = clamp(req.nextUrl.searchParams.get("h"), 360);

  try {
    const meta = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?${new URLSearchParams({ location, source: "outdoor", key })}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    ).then((r) => r.json() as Promise<{ status: string }>);
    if (meta.status === "REQUEST_DENIED") return NextResponse.json({ reason: "key_rejected" });
    if (meta.status !== "OK") return NextResponse.json({ reason: "no_imagery" });

    // No heading → Google points the camera at the requested location (the house).
    const img = await fetch(
      `https://maps.googleapis.com/maps/api/streetview?${new URLSearchParams({ location, size: `${w}x${h}`, fov: "80", source: "outdoor", return_error_code: "true", key })}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!img.ok) return NextResponse.json({ reason: "no_imagery" });
    return new NextResponse(await img.arrayBuffer(), {
      headers: {
        "Content-Type": img.headers.get("content-type") ?? "image/jpeg",
        // Short, browser-only caching; nothing is stored on our server.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ reason: "unavailable" }, { status: 502 });
  }
}
