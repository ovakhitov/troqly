"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { mouvementReduit, OVALE, useTrait } from "./scene";

// « Une annonce, [photos] trois étapes. » : une petite mosaïque de photos s'ouvre entre les mots quand le titre
// arrive, les trois étapes montent l'une après l'autre au défilement, puis l'appel s'entoure d'un ovale tracé à la
// main (scène « processus » du skill site-immersif-skill, en version légère : pas d'épinglage, et à part l'ouverture
// de la mosaïque tout est fait par le navigateur en CSS). Sans animation : mosaïque ouverte, étapes en place.
const ETAPES = [
  {
    titre: "Photographiez.",
    texte: "Quelques photos, un titre, votre ville. Le questionnaire vous aide à écrire la description, et l'annonce est en ligne aussitôt.",
  },
  {
    titre: "Fixez votre prix.",
    texte: "C'est vous qui décidez. Un acheteur peut faire une offre : vous l'acceptez, la refusez ou proposez un autre prix.",
  },
  {
    titre: "Remettez l'objet.",
    texte: "En main propre près de chez vous, ou par colis. Quand l'acheteur paie en ligne, l'argent vous est versé une fois l'objet remis.",
  },
];

export function Processus({ photos }: { photos: string[] }) {
  const titre = useRef<HTMLHeadingElement>(null);
  const chemin = useRef<SVGPathElement>(null);
  useTrait(chemin);

  // La mosaïque s'ouvre une seule fois, quand le titre est bien entré à l'écran
  useEffect(() => {
    const t = titre.current;
    if (!t || mouvementReduit()) return;
    t.dataset.anime = "";
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        t.dataset.vu = "";
        observateur.disconnect();
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    observateur.observe(t);
    return () => {
      observateur.disconnect();
      delete t.dataset.anime;
      delete t.dataset.vu;
    };
  }, []);

  const quatre = Array.from({ length: 4 }, (_, i) => photos[i % Math.max(photos.length, 1)]);

  return (
    <section aria-labelledby="titre-processus" className="grid gap-8 sm:gap-12">
      <h2
        ref={titre}
        id="titre-processus"
        className="processus-titre text-center text-[clamp(2.125rem,9vw,2.75rem)] leading-[1.05] font-semibold tracking-[-0.05em] text-balance text-prune-nuit sm:text-[clamp(2.75rem,5.4vw,4.5rem)]"
      >
        Une annonce,{" "}
        <span className="whitespace-nowrap">
          <span aria-hidden="true" className="processus-fenetre">
            <span className="processus-mosaique">
              {quatre.map((photo, i) =>
                photo ? (
                  <span key={i} className="relative overflow-hidden bg-creux">
                    <Image src={photo} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                ) : (
                  <span key={i} className="bg-action" />
                ),
              )}
            </span>
          </span>
          trois
        </span>{" "}
        étapes.
      </h2>

      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {ETAPES.map((e, i) => (
          <li key={e.titre} className="processus-etape carte grid content-start p-6 sm:p-7 lg:p-8" style={{ "--i": i } as CSSProperties}>
            <span aria-hidden="true" className="text-[2.75rem] leading-none font-normal tracking-[-0.06em] text-prune tabular-nums lg:text-[3.5rem]">
              0{i + 1}
            </span>
            <h3 className="mt-8 text-[1.5rem] leading-tight font-semibold tracking-[-0.04em] text-prune-nuit lg:mt-12 lg:text-[1.75rem]">
              <span className="sr-only">Étape {i + 1} : </span>
              {e.titre}
            </h3>
            <p className="mt-3 text-[17px] leading-[1.45] text-mauve">{e.texte}</p>
          </li>
        ))}
      </ol>

      <p className="processus-appel text-center">
        <Link
          href="/deposer"
          data-curseur="anneau"
          className="group relative inline-flex items-center gap-2 px-[0.95em] py-[0.4em] text-[clamp(1.25rem,5.4vw,2.125rem)] font-medium tracking-[-0.03em] whitespace-nowrap text-prune"
        >
          Déposer une annonce
          <span aria-hidden="true" className="transition-transform duration-300 ease-verre group-hover:translate-x-1">
            →
          </span>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path ref={chemin} d={OVALE} className="trait fill-none stroke-prune [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
          </svg>
        </Link>
      </p>
    </section>
  );
}
