"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { creerTrace, mouvementReduit, OVALE, tranche, useScene } from "./scene";

// Trois « Pas de… » qui s'encrent l'un après l'autre, une chute entourée d'un ovale, et sous la souris une traînée
// de photos d'annonces qui surgissent puis s'effacent (scène « objections » du skill site-immersif-skill).
const SEUILS = [0.02, 0.16, 0.3, 0.46];
// Largeurs variées : c'est ce qui empêche la traînée de ressembler à une grille
const LARGEURS = [150, 190, 120, 200, 96, 170, 140, 200, 110, 160, 130, 180];

export function Objections({ photos }: { photos: string[] }) {
  const racine = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const texte = useRef<HTMLParagraphElement>(null);
  const chemin = useRef<SVGPathElement>(null);
  const trace = useRef<ReturnType<typeof creerTrace> | null>(null);

  useEffect(() => {
    const p = texte.current;
    if (!p || !chemin.current || mouvementReduit()) return;
    p.dataset.anime = "";
    const t = creerTrace(chemin.current);
    t.poser(1);
    trace.current = t;
    const remesurer = () => t.mesurer();
    document.fonts?.ready.then(remesurer);
    window.addEventListener("resize", remesurer);
    return () => {
      window.removeEventListener("resize", remesurer);
      delete p.dataset.anime;
      trace.current = null;
    };
  }, []);

  useScene(racine, (p) => {
    if (!trace.current) return;
    texte.current?.querySelectorAll("[data-phrase]").forEach((el, i) => el.classList.toggle("on", p > SEUILS[i]));
    trace.current.poser(1 - tranche(p, 0.5, 0.68));
  });

  // Traînée : chaque déplacement de 38 px pose la photo suivante sous la souris
  useEffect(() => {
    const s = scene.current;
    const souris = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!s || !photos.length || mouvementReduit()) return;
    const images = [...s.querySelectorAll<HTMLElement>("[data-trainee]")];
    let indice = 0;
    let plan = 10;
    let cumul = 0;
    let avant: { x: number; y: number } | null = null;
    const bouger = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !souris.matches) return;
      const r = s.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!avant) {
        avant = { x, y };
        return;
      }
      cumul += Math.hypot(x - avant.x, y - avant.y);
      avant = { x, y };
      if (cumul < 38) return;
      cumul = 0;
      const img = images[indice % images.length];
      indice++;
      const angle = ((indice * 47) % 17) - 8;
      img.style.zIndex = String(++plan);
      img.getAnimations().forEach((a) => a.cancel());
      const a = (k: number) => `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -50%) rotate(${angle}deg) scale(${k})`;
      img.animate(
        [
          { opacity: 0, transform: a(0.5) },
          { opacity: 1, transform: a(1), offset: 0.14 },
          { opacity: 1, transform: a(1), offset: 0.72 },
          { opacity: 0, transform: a(0.94) },
        ],
        { duration: 3600, easing: "cubic-bezier(0.19, 1, 0.22, 1)", fill: "forwards" },
      );
    };
    const sortir = () => {
      avant = null;
    };
    s.addEventListener("pointermove", bouger, { passive: true });
    s.addEventListener("pointerleave", sortir);
    return () => {
      s.removeEventListener("pointermove", bouger);
      s.removeEventListener("pointerleave", sortir);
    };
  }, [photos]);

  return (
    <section ref={racine} aria-label="Ce que Troqly ne vous demande pas" className="relative h-[220svh] motion-reduce:h-auto">
      <div
        ref={scene}
        className="sticky top-0 grid h-[100svh] place-items-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-16"
      >
        <p
          ref={texte}
          className="objections relative z-[2] max-w-[58rem] text-center text-[clamp(1.75rem,7.4vw,2.5rem)] leading-[1.14] font-semibold tracking-[-0.045em] text-prune-nuit sm:text-[clamp(2.25rem,4.6vw,3.75rem)]"
        >
          <span data-phrase="">Pas d&apos;abonnement.</span> <span data-phrase="">Pas de frais pour déposer.</span>{" "}
          <span data-phrase="">Pas d&apos;appli à installer.</span>
          <br />
          <span data-phrase="">
            Juste vous, et{" "}
            <span className="relative whitespace-nowrap text-prune">
              votre prix.
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-[0.3em] -inset-y-[0.2em] h-[calc(100%+0.4em)] w-[calc(100%+0.6em)] overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <path ref={chemin} d={OVALE} className="fill-none stroke-prune [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
              </svg>
            </span>
          </span>
        </p>

        {/* Réserve de photos pour la traînée sous la souris */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[3] overflow-hidden motion-reduce:hidden">
          {photos.slice(0, LARGEURS.length).map((photo, i) => (
            <Image
              key={i}
              data-trainee=""
              src={photo}
              alt=""
              width={240}
              height={300}
              className="absolute top-0 left-0 max-w-none rounded-[14px] object-cover opacity-0 shadow-large will-change-transform"
              style={{ width: LARGEURS[i], height: Math.round(LARGEURS[i] * 1.25) }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
