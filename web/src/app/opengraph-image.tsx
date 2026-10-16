import { ImageResponse } from "next/og";

export const alt = "Troqly, petites annonces entre particuliers près de chez vous";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image de partage (réseaux sociaux, messageries) générée à la volée
export default function ImagePartage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f2f4f5",
          color: "#0f0f10",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 44, fontWeight: 600 }}>
          <svg width="56" height="56" viewBox="0 0 26 26">
            <path d="M8 7.5a5.5 5.5 0 1 0 0 11h10a5.5 5.5 0 1 0 0-11" fill="none" stroke="#5a2a5a" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M15.5 4.5l3 3-3 3" fill="none" stroke="#5a2a5a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Troqly
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 600, lineHeight: 1.04, letterSpacing: -3, maxWidth: 900 }}>
          Ce qui dort au grenier cherche preneur à deux rues d&apos;ici.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 30, color: "#6b6867" }}>
          <span
            style={{
              display: "flex",
              background: "#5a2a5a",
              color: "#ffffff",
              padding: "10px 26px",
              borderRadius: 9999,
              fontWeight: 600,
              boxShadow: "0 4px 24px rgba(90, 42, 90, 0.34)",
            }}
          >
            Main propre ou colis
          </span>
          Partout en France
        </div>
      </div>
    ),
    size,
  );
}
