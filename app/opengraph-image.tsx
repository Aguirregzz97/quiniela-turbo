import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export const alt =
  "Quiniela Turbo - Compite con tus amigos prediciendo resultados de fútbol";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public", "img", "logo_test.png"),
  );
  const logoSrc = Uint8Array.from(logoData).buffer as unknown as string;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0e0a1f 0%, #1a1140 50%, #0e0a1f 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative glows (violet, matching the app theme) */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "460px",
            height: "460px",
            background:
              "radial-gradient(circle, rgba(139, 92, 246, 0.28) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-160px",
            left: "-160px",
            width: "540px",
            height: "540px",
            background:
              "radial-gradient(circle, rgba(124, 92, 255, 0.22) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "28px",
          }}
        >
          {/* App logo */}
          <div
            style={{
              display: "flex",
              width: "220px",
              height: "220px",
              borderRadius: "48px",
              boxShadow: "0 24px 70px rgba(124, 92, 255, 0.45)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="Quiniela Turbo"
              width={220}
              height={220}
              style={{ borderRadius: "48px" }}
            />
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                fontSize: "76px",
                fontWeight: "800",
                background: "linear-gradient(90deg, #ffffff 0%, #c4b5fd 100%)",
                backgroundClip: "text",
                color: "transparent",
                fontFamily: "system-ui",
                letterSpacing: "-2px",
              }}
            >
              Quiniela Turbo
            </span>
            <span
              style={{
                fontSize: "28px",
                color: "#b8a9e0",
                fontFamily: "system-ui",
                fontWeight: "500",
              }}
            >
              Compite con tus amigos prediciendo resultados de fútbol
            </span>
          </div>

          {/* Feature badges */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(139, 92, 246, 0.2)",
                padding: "12px 24px",
                borderRadius: "100px",
                border: "1px solid rgba(139, 92, 246, 0.4)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🏆</span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#c4b5fd",
                  fontWeight: "600",
                  fontFamily: "system-ui",
                }}
              >
                Quinielas
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(45, 212, 191, 0.18)",
                padding: "12px 24px",
                borderRadius: "100px",
                border: "1px solid rgba(45, 212, 191, 0.35)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🎯</span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#5eead4",
                  fontWeight: "600",
                  fontFamily: "system-ui",
                }}
              >
                Pronósticos
              </span>
            </div>
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              color: "#8b7fb0",
              fontFamily: "system-ui",
            }}
          >
            www.quinielaturbo.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
