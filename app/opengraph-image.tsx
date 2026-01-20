import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Quiniela Turbo - Compite con tus amigos prediciendo resultados de fútbol";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
          background: "linear-gradient(135deg, #0a1628 0%, #0d2847 50%, #0a1628 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorative elements */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-150px",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)",
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
            gap: "24px",
          }}
        >
          {/* Logo placeholder - using text-based logo since we can't easily load external images in edge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "200px",
              height: "200px",
              background: "linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)",
              borderRadius: "40px",
              boxShadow: "0 20px 60px rgba(59, 130, 246, 0.4)",
              position: "relative",
            }}
          >
            {/* Soccer ball icon */}
            <div
              style={{
                position: "absolute",
                top: "-20px",
                right: "-10px",
                width: "70px",
                height: "70px",
                background: "white",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                fontSize: "40px",
              }}
            >
              ⚽
            </div>
            {/* Lightning bolt */}
            <div
              style={{
                position: "absolute",
                bottom: "-15px",
                left: "-15px",
                fontSize: "50px",
                filter: "drop-shadow(0 4px 10px rgba(250, 204, 21, 0.5))",
                display: "flex",
              }}
            >
              ⚡
            </div>
            <span
              style={{
                fontSize: "100px",
                fontWeight: "900",
                color: "white",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                fontFamily: "system-ui",
                letterSpacing: "-4px",
              }}
            >
              QT
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "72px",
                fontWeight: "800",
                background: "linear-gradient(90deg, #ffffff 0%, #94a3b8 100%)",
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
                color: "#94a3b8",
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
              marginTop: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(59, 130, 246, 0.2)",
                padding: "12px 24px",
                borderRadius: "100px",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🏆</span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#60a5fa",
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
                background: "rgba(16, 185, 129, 0.2)",
                padding: "12px 24px",
                borderRadius: "100px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🎯</span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#34d399",
                  fontWeight: "600",
                  fontFamily: "system-ui",
                }}
              >
                Survivor
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
              color: "#64748b",
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
    }
  );
}

