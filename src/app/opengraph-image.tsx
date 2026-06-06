import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Decentratix | Fair Ticket Resale for Events";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Dynamic OG image used by social previews and search sharing cards.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          position: "relative",
          background:
            "linear-gradient(135deg, #07111f 0%, #0b1220 45%, #0d2f3d 100%)",
          color: "#f3f4f6",
          fontFamily: "Arial, sans-serif",
          padding: "64px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 15% 20%, rgba(11, 222, 252, 0.20), transparent 28%), radial-gradient(circle at 85% 15%, rgba(99, 179, 237, 0.20), transparent 30%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              color: "#9beefd",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Decentratix
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div
              style={{
                fontSize: 70,
                lineHeight: 1.04,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                maxWidth: "980px",
              }}
            >
              Fair Ticket Resale
              <br />
              With Secure Entry Checks
            </div>

            <div
              style={{
                fontSize: 32,
                lineHeight: 1.35,
                color: "#d1d5db",
                maxWidth: "980px",
              }}
            >
              Price caps, organizer royalties, and rotating QR verification
              built for modern event operations.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              color: "#8fddeb",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            <span>decentratix.hedigardi.com</span>
            <span>Base Sepolia Demo</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
