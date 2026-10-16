"use client";

import { useEffect, useRef } from "react";
import { creerTrace, douce, mouvementReduit, OVALE, tranche, useScene } from "./scene";

// Le texte s'encre lettre après lettre pendant qu'on fait défiler ; un ovale tracé à la main entoure deux mots
// quand l'encre les atteint (scène « manifeste » du skill site-immersif-skill). Sans animation : texte plein, ovale tracé.
const MORCEAUX = [
  { texte: "Chaque objet mérite une seconde vie. Sur Troqly, ce qui dort au fond d'un placard trouve preneur " },
  { texte: "tout près", entoure: true },
  { texte: " de chez vous, ou à l'autre bout de la France. Vous fixez le prix, vous choisissez comment le remettre." },
];
const TEXTE = MORCEAUX.map((m) => m.texte).join("");
const DEBUT = 0;
const FIN = 0.62;

// Chaque mot reste insécable, chaque lettre a son span
function Lettres({ texte }: { texte: string }) {
  return texte.split(/(\s+)/).map((mot, i) =>
    /^\s+$/.test(mot) ? (
      " "
    ) : mot ? (
      <span key={i} className="whitespace-nowrap">
        {[...mot].map((c, j) => (
          <span key={j} data-c="">
            {c}
          </span>
        ))}
      </span>
    ) : null,
  );
}

export function Manifeste() {
  const racine = useRef<HTMLElement>(null);
  const paragraphe = useRef<HTMLParagraphElement>(null);
  const chemin = useRef<SVGPathElement>(null);
  const etat = useRef<{ lettres: HTMLElement[]; allumees: number; finOvale: number; trace: ReturnType<typeof creerTrace> } | null>(null);

  useEffect(() => {
    const p = paragraphe.current;
    if (!p || !chemin.current || mouvementReduit()) return;
    p.dataset.anime = "";
    const lettres = [...p.querySelectorAll<HTMLElement>("[data-c]")];
    const ovale = p.querySelectorAll<HTMLElement>(".ovale [data-c]");
    const trace = creerTrace(chemin.current);
    trace.poser(1);
    etat.current = { lettres, allumees: 0, finOvale: lettres.indexOf(ovale[ovale.length - 1]), trace };
    const remesurer = () => trace.mesurer();
    document.fonts?.ready.then(remesurer);
    window.addEventListener("resize", remesurer);
    return () => {
      window.removeEventListener("resize", remesurer);
      delete p.dataset.anime;
      lettres.forEach((l) => l.classList.remove("on"));
      etat.current = null;
    };
  }, []);

  useScene(racine, (p) => {
    const e = etat.current;
    if (!e) return;
    const n = e.lettres.length;
    const idx = Math.round(tranche(p, DEBUT, FIN) * n);
    if (idx !== e.allumees) {
      for (let i = Math.min(idx, e.allumees); i < Math.max(idx, e.allumees); i++) e.lettres[i].classList.toggle("on", i < idx);
      e.allumees = idx;
    }
    // L'ovale ne se trace qu'une fois l'encre arrivée au bout des mots entourés
    const t = DEBUT + ((e.finOvale + 1) / n) * (FIN - DEBUT);
    e.trace.poser(1 - tranche(p, t, t + 0.16, douce));
  });

  return (
    <section ref={racine} aria-label="L'idée de Troqly" className="relative h-[240svh] motion-reduce:h-auto">
      <div className="sticky top-0 grid h-[100svh] place-items-center motion-reduce:static motion-reduce:h-auto motion-reduce:py-16">
        <p className="sr-only">{TEXTE}</p>
        <p
          ref={paragraphe}
          aria-hidden="true"
          className="manifeste max-w-[55rem] text-[clamp(1.375rem,5.8vw,1.875rem)] leading-[1.18] font-medium tracking-[-0.03em] text-prune-nuit sm:text-[clamp(1.75rem,3.6vw,3.25rem)] sm:leading-[1.14]"
        >
          {MORCEAUX.map((m, i) =>
            m.entoure ? (
              <span key={i} className="ovale relative whitespace-nowrap text-prune">
                <Lettres texte={m.texte} />
                <svg
                  className="pointer-events-none absolute -inset-x-[0.35em] -inset-y-[0.22em] h-[calc(100%+0.44em)] w-[calc(100%+0.7em)] overflow-visible"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path ref={chemin} d={OVALE} className="fill-none stroke-prune [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
                </svg>
              </span>
            ) : (
              <Lettres key={i} texte={m.texte} />
            ),
          )}
        </p>
      </div>
    </section>
  );
}
