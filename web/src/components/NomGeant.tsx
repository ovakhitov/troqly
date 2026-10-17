"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// Le nom géant du pied de page : ses lettres montent l'une après l'autre, comme un rideau, quand il arrive à
// l'écran (d'après le pied de page du skill site-immersif-skill). Sans JavaScript ou en mouvement réduit, il est
// simplement là.
export function NomGeant() {
  const nom = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = nom.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.anime = "";
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        el.dataset.vu = "";
        observateur.disconnect();
      },
      { threshold: 0.35 },
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <p
      ref={nom}
      aria-hidden="true"
      className="nom-geant mx-auto max-w-[75rem] px-2 text-center text-[clamp(5rem,27vw,21rem)] leading-[1.12] font-semibold tracking-[-0.07em] whitespace-nowrap select-none"
    >
      {[..."troqly"].map((lettre, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <span className="nom-geant-lettre inline-block" style={{ "--i": i } as CSSProperties}>
            {lettre}
          </span>
        </span>
      ))}
    </p>
  );
}
