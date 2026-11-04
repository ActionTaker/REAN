import { ImageResponse } from "next/og";

export const alt = "DEALAN — Know your max offer before you call the agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link-preview card for shares on Reddit, BiggerPockets, email and chat. Example figures are the app's sample deal. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fafaf9", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#18181b", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 5, padding: 10 }}>
              <div style={{ width: 5, height: 10, background: "#fafaf9", borderRadius: 2 }} />
              <div style={{ width: 5, height: 18, background: "#fafaf9", borderRadius: 2 }} />
              <div style={{ width: 5, height: 14, background: "#fafaf9", borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#18181b" }}>DEALAN</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 60, fontWeight: 700, color: "#18181b", lineHeight: 1.08, letterSpacing: -1.5 }}>Know your max offer before you call the agent.</div>
            <div style={{ fontSize: 26, color: "#57534e", lineHeight: 1.35 }}>Rental analysis for U.S. investors — comps you can audit, BRRRR, flips and ADUs.</div>
          </div>
          <div style={{ fontSize: 22, color: "#57534e" }}>Free during early access</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 48, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#ffffff", border: "2px solid #e7e5e4", borderRadius: 20, padding: 32, gap: 18 }}>
            <div style={{ fontSize: 20, color: "#78716c" }}>Max offer that meets your goals</div>
            <div style={{ fontSize: 64, fontWeight: 700, color: "#18181b" }}>$170,500</div>
            <div style={{ display: "flex", fontSize: 20, color: "#b91c1c" }}>Asking $189,000 · $18,500 over</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 20, color: "#44403c", borderTop: "2px solid #f5f5f4", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash flow</span><span>$191/mo</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cap rate</span><span>7.12%</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cash-on-cash</span><span>3.76%</span></div>
            </div>
            <div style={{ fontSize: 15, color: "#a8a29e" }}>Sample deal</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
