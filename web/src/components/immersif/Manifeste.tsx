"use client";

import { Fragment, useRef, type CSSProperties } from "react";
import { OVALE, useTrait } from "./scene";

// Une seule phrase, qui s'encre mot après mot pendant qu'elle monte vers le milieu de l'écran ; un ovale tracé à
// la main entoure « tout près » quand l'encre l'atteint (scène « manifeste » du skill site-immersif-skill, en version
// légère : pas d'épinglage, et l'animation est faite par le navigateur en CSS, sans script pendant le défilement).
// Sans cette prise en charge ou en mouvement réduit : texte plein, ovale tracé.
const MOTS = "Chaque objet mérite une seconde vie, tout près de chez vous.".split(" ");
const OVALE_DE = 6; // « tout près »
const OVALE_A = 8;

// Les mots [de, a[ de la phrase, chacun dans son span numéroté (--i règle le moment où il s'encre)
const mots = (de: number, a: number) =>
  MOTS.slice(de, a).map((mot, k) => (
    <Fragment key={de + k}>
      {k > 0 && " "}
      <span data-mot="" style={{ "--i": de + k } as CSSProperties}>
        {mot}
      </span>
    </Fragment>
  ));

export function Manifeste() {
  const chemin = useRef<SVGPathElement>(null);
  useTrait(chemin);

  return (
    <section aria-label="L'idée de Troqly" className="grid place-items-center py-[8svh] text-center sm:py-[12svh]">
      <p className="manifeste max-w-[16em] text-[clamp(1.875rem,8.4vw,2.75rem)] leading-[1.12] font-medium tracking-[-0.045em] text-balance text-prune-nuit sm:text-[clamp(2.75rem,5.6vw,4.5rem)]">
        {mots(0, OVALE_DE)}{" "}
        <span className="relative whitespace-nowrap text-prune">
          {mots(OVALE_DE, OVALE_A)}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-[0.3em] -inset-y-[0.08em] h-[calc(100%+0.16em)] w-[calc(100%+0.6em)] overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path ref={chemin} d={OVALE} className="trait fill-none stroke-prune [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
          </svg>
        </span>{" "}
        {mots(OVALE_A, MOTS.length)}
      </p>
    </section>
  );
}
