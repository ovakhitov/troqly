"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconeChevron } from "../Icones";

// Rangée qui défile à l'horizontale (doigt, molette, clavier), avec les flèches rondes de la référence Shop
// sur grand écran. Chaque flèche disparaît quand on est au bout.
export function Defilement({ children, libelle }: { children: ReactNode; libelle: string }) {
  const rangee = useRef<HTMLDivElement>(null);
  const [bords, setBords] = useState({ debut: true, fin: false });

  useEffect(() => {
    const el = rangee.current;
    if (!el) return;
    const mesurer = () => setBords({ debut: el.scrollLeft < 8, fin: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    mesurer();
    el.addEventListener("scroll", mesurer, { passive: true });
    window.addEventListener("resize", mesurer);
    return () => {
      el.removeEventListener("scroll", mesurer);
      window.removeEventListener("resize", mesurer);
    };
  }, []);

  const aller = (sens: 1 | -1) => {
    const el = rangee.current;
    if (!el) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sens * el.clientWidth * 0.85, behavior: calme ? "auto" : "smooth" });
  };

  const fleche = "absolute top-[calc(50%+1rem)] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface text-prune-nuit shadow-large transition-[opacity,scale] duration-200 ease-verre hover:scale-105 active:scale-95 md:grid";

  return (
    <div className="relative">
      <div
        ref={rangee}
        role="region"
        aria-label={libelle}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => aller(-1)}
        aria-label="Faire défiler vers la gauche"
        className={`${fleche} -left-2 ${bords.debut ? "pointer-events-none opacity-0" : ""}`}
      >
        <IconeChevron className="size-4 rotate-180" />
      </button>
      <button
        type="button"
        onClick={() => aller(1)}
        aria-label="Faire défiler vers la droite"
        className={`${fleche} -right-2 ${bords.fin ? "pointer-events-none opacity-0" : ""}`}
      >
        <IconeChevron className="size-4" />
      </button>
    </div>
  );
}
