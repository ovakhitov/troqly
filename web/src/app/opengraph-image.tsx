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
          background: "#3b1840",
          color: "#f8eff8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 44, fontWeight: 700 }}>
          <svg width="56" height="56" viewBox="0 0 26 26">
            <path d="M8 7.5a5.5 5.5 0 1 0 0 11h10a5.5 5.5 0 1 0 0-11" fill="none" stroke="#f8eff8" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M15.5 4.5l3 3-3 3" fill="none" stroke="#f8eff8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Troqly
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
          Ce qui dort au grenier cherche preneur à deux rues d&apos;ici.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 30, color: "#d8c3dc" }}>
          <span
            style={{
              display: "flex",
              background: "#fffaf1",
              color: "#1f1421",
              padding: "8px 22px",
              borderRadius: 8,
              fontWeight: 700,
              transform: "rotate(-3deg)",
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
