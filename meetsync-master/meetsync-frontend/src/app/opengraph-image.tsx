import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DraftMeet — Free Calendly Alternative with Automatic Google Meet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080c18",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top purple glow orb */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(91,53,232,0.5) 0%, rgba(59,106,232,0.22) 40%, transparent 70%)",
            filter: "blur(90px)",
            display: "flex",
          }}
        />
        {/* Bottom-right cyan orb */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(56,191,255,0.32), transparent 70%)",
            filter: "blur(90px)",
            display: "flex",
          }}
        />

        {/* Logo + name row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #5B35E8 0%, #3B6AE8 55%, #38BFFF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 800,
              color: "white",
            }}
          >
            D
          </div>
          <span
            style={{
              fontSize: "34px",
              fontWeight: 700,
              color: "#e8edf8",
            }}
          >
            DraftMeet
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: "68px",
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.08,
            color: "#e8edf8",
            maxWidth: "900px",
            marginBottom: "28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>Smart scheduling links</span>
          <span
            style={{
              background:
                "linear-gradient(135deg, #5B35E8 0%, #3B6AE8 55%, #38BFFF 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            without the chaos
          </span>
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            fontSize: "22px",
            color: "#7b8db8",
            textAlign: "center",
            maxWidth: "700px",
            marginBottom: "44px",
            display: "flex",
          }}
        >
          Free Calendly alternative · One-time links · Auto Google Meet
        </div>

        {/* URL pill */}
        <div
          style={{
            display: "flex",
            padding: "10px 24px",
            borderRadius: "999px",
            border: "1px solid rgba(91,53,232,0.45)",
            background: "rgba(91,53,232,0.12)",
            color: "#7b8db8",
            fontSize: "18px",
          }}
        >
          draftmeet.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
