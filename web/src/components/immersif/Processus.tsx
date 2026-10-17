"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { borner, creerTrace, douce, mouvementReduit, OVALE, sortie, tranche, useScene } from "./scene";

// « Une annonce, [photos] trois étapes. » : la mosaïque naît entre les mots et grandit jusqu'à remplir l'écran,
// un rideau de lames prune la couvre puis se retire sur une scène toute typographique où le numéro d'étape
// défile comme un compteur ; l'appel final se dessine d'un ovale (scène « processus » du skill site-immersif-skill).
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
const LAMES = 7;
const MARGE = 16; // écart entre la grande image et le haut et le bas de l'écran
const RAYON = 28;

export function Processus({ photos }: { photos: string[] }) {
  const racine = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const ligne = useRef<HTMLDivElement>(null);
  const fenetre = useRef<HTMLSpanElement>(null);
  const mosaique = useRef<HTMLSpanElement>(null);
  const compteur = useRef<HTMLDivElement>(null);
  const rouleau = useRef<HTMLSpanElement>(null);
  const appel = useRef<HTMLParagraphElement>(null);
  const chemin = useRef<SVGPathElement>(null);
  const mesures = useRef({ largeur: 1, hauteur: 1, taille: 40, decalage: 0 });
  const trace = useRef<ReturnType<typeof creerTrace> | null>(null);
  const derniere = useRef(0);
  const anime = useRef(false);

  const rendre = useCallback((p: number) => {
    derniere.current = p;
    const s = scene.current;
    if (!anime.current || !s) return;
    const m = mesures.current;

    // Les mots se posent pendant que la scène monte à l'écran
    s.querySelectorAll<HTMLElement>("[data-mot]").forEach((mot, i) => {
      const k = tranche(p, -0.12 + i * 0.025, -0.04 + i * 0.025, sortie);
      mot.style.opacity = k.toFixed(3);
      mot.style.transform = `translateY(${((1 - k) * 16).toFixed(1)}px)`;
    });

    // La mosaïque naît entre les mots, en format paysage, puis remplit l'écran ; la caméra ne recule jamais
    const g = tranche(p, 0.04, 0.26, douce);
    const largeur = m.largeur * g;
    const hauteur = Math.min(m.hauteur, Math.max(largeur / 1.9, m.hauteur * Math.pow(g, 1.6)));
    const f = fenetre.current!;
    f.style.width = `${largeur.toFixed(1)}px`;
    f.style.height = `${hauteur.toFixed(1)}px`;
    const marge = m.taille * 0.13 + Math.min(g * 60, m.taille * 0.12);
    f.style.marginInline = `${marge.toFixed(1)}px`;
    f.style.borderRadius = `${Math.max(6, RAYON * g).toFixed(1)}px`;
    ligne.current!.style.transform = `translateX(${(-m.decalage * g).toFixed(1)}px)`;
    mosaique.current!.style.transform = `translate(-50%, -50%) scale(${(1 + tranche(p, 0.26, 0.46, sortie) * 0.18).toFixed(4)})`;

    // Rideau de lames : il couvre de gauche à droite, puis se retire de droite à gauche
    s.querySelectorAll<HTMLElement>("[data-lame]").forEach((lame, i) => {
      const j = LAMES - 1 - i;
      const couvre = tranche(p, 0.26 + i * 0.005, 0.32 + i * 0.005, douce);
      const degage = tranche(p, 0.38 + j * 0.005, 0.44 + j * 0.005, douce);
      lame.style.transformOrigin = degage > 0 ? "top" : "bottom";
      lame.style.transform = `scaleY(${(couvre - degage).toFixed(4)})`;
    });
    ligne.current!.style.opacity = p > 0.37 ? "0" : "1";

    // Le compteur défile pendant que les étapes se relaient : chaque étape tient un moment, puis s'efface
    // avant que la suivante apparaisse, jamais deux à la fois. Rien n'apparaît avant que le rideau soit retiré.
    const brut = tranche(p, 0.46, 0.84) * (ETAPES.length - 1);
    const palier = Math.min(Math.floor(brut), ETAPES.length - 2);
    const suite = palier + tranche(brut - palier, 0.55, 1, douce);
    const porte = tranche(p, 0.42, 0.48);
    compteur.current!.style.opacity = porte.toFixed(3);
    rouleau.current!.style.transform = `translateY(${(-suite).toFixed(4)}em)`;
    s.querySelectorAll<HTMLElement>("[data-etape]").forEach((etape, i) => {
      const d = suite - i;
      const vu = d >= 0 ? borner(1 - d / 0.35) : borner((d + 0.65) / 0.3);
      etape.style.opacity = (vu * porte).toFixed(3);
      etape.style.transform = `translateY(calc(-50% + ${(-d * 96).toFixed(1)}px))`;
    });

    // L'appel conclut la scène, entouré d'un ovale qui se dessine
    const a = tranche(p, 0.86, 0.91, sortie);
    const cta = appel.current!;
    cta.style.opacity = a.toFixed(3);
    cta.style.visibility = a > 0.01 ? "visible" : "hidden";
    cta.style.transform = `translate(-50%, ${((1 - a) * 26).toFixed(1)}px)`;
    trace.current?.poser(1 - tranche(p, 0.89, 0.97));
  }, []);

  useEffect(() => {
    const s = scene.current;
    if (!s || mouvementReduit()) return;
    anime.current = true;
    if (chemin.current) trace.current = creerTrace(chemin.current);
    const mesurer = () => {
      const l = ligne.current!;
      const f = fenetre.current!;
      let gauche = 0;
      let droite = 0;
      let apres = false;
      for (const enfant of l.children) {
        if (enfant === f) apres = true;
        else if (apres) droite += (enfant as HTMLElement).offsetWidth;
        else gauche += (enfant as HTMLElement).offsetWidth;
      }
      mesures.current = {
        largeur: s.clientWidth,
        hauteur: s.clientHeight - 2 * MARGE,
        taille: parseFloat(getComputedStyle(l).fontSize),
        decalage: (gauche - droite) / 2,
      };
      const mo = mosaique.current!;
      mo.style.width = `${s.clientWidth}px`;
      mo.style.height = `${s.clientHeight - 2 * MARGE}px`;
      trace.current?.mesurer();
      rendre(derniere.current);
    };
    mesurer();
    document.fonts?.ready.then(mesurer);
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(s);
    return () => {
      observateur.disconnect();
      anime.current = false;
    };
  }, [rendre]);

  useScene(racine, rendre);

  const quatre = Array.from({ length: 4 }, (_, i) => photos[i % Math.max(photos.length, 1)]);

  return (
    <section ref={racine} aria-labelledby="titre-processus" className="processus relative h-[700svh] motion-reduce:h-auto">
      <div
        ref={scene}
        className="sticky top-0 h-[100svh] overflow-hidden motion-reduce:static motion-reduce:grid motion-reduce:h-auto motion-reduce:gap-10 motion-reduce:py-10"
      >
        <h2 id="titre-processus" className="sr-only">
          Une annonce, trois étapes
        </h2>

        <div
          ref={ligne}
          aria-hidden="true"
          className="processus-ligne text-[clamp(1.5rem,6.2vw,3.5rem)] font-semibold tracking-[-0.045em] text-prune-nuit"
        >
          <span data-mot="">Une</span>
          <span data-mot="" className="ml-[0.28em]">
            annonce,
          </span>
          <span ref={fenetre} className="processus-fenetre">
            <span ref={mosaique} className="processus-mosaique">
              {quatre.map((photo, i) =>
                photo ? (
                  <span key={i} className="relative overflow-hidden bg-creux">
                    <Image src={photo} alt="" fill sizes="50vw" className="object-cover" />
                  </span>
                ) : (
                  <span key={i} className="bg-action" />
                ),
              )}
            </span>
          </span>
          <span data-mot="">trois</span>
          <span data-mot="" className="ml-[0.28em]">
            étapes.
          </span>
        </div>

        {/* Numéro d'étape en filigrane géant, qui défile comme un compteur */}
        <div
          ref={compteur}
          aria-hidden="true"
          className="processus-compteur pointer-events-none leading-none font-normal tracking-[-0.05em] text-prune-nuit/10 tabular-nums"
        >
          <span>0</span>
          <span className="block h-[1em] overflow-hidden">
            <span ref={rouleau} className="block">
              {ETAPES.map((_, i) => (
                <i key={i} className="block h-[1em] pr-[0.06em] not-italic">
                  {i + 1}
                </i>
              ))}
            </span>
          </span>
        </div>

        <ol className="processus-etapes">
          {ETAPES.map((e, i) => (
            <li key={e.titre} data-etape="" className="processus-etape">
              <h3 className="text-[clamp(2rem,8.6vw,2.875rem)] leading-[1.02] font-semibold tracking-[-0.05em] text-prune-nuit sm:text-[clamp(2.375rem,4.6vw,4rem)]">
                <span className="sr-only">Étape {i + 1} : </span>
                {e.titre}
              </h3>
              <p className="mt-4 max-w-[26em] text-[17px] leading-[1.45] text-mauve sm:text-[19px]">{e.texte}</p>
            </li>
          ))}
        </ol>

        <p ref={appel} className="processus-appel">
          <Link
            href="/deposer"
            className="group relative inline-flex items-center gap-2 px-[0.6em] py-[0.3em] text-[clamp(1.25rem,5.4vw,2.125rem)] font-medium tracking-[-0.03em] whitespace-nowrap text-prune"
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
              <path ref={chemin} d={OVALE} className="fill-none stroke-prune [stroke-width:1.5] [vector-effect:non-scaling-stroke]" />
            </svg>
          </Link>
        </p>

        {/* Rideau de lames, sans aucune arête dessinée */}
        <div aria-hidden="true" className="processus-rideau">
          {Array.from({ length: LAMES }, (_, i) => (
            <span key={i} data-lame="" />
          ))}
        </div>
      </div>
    </section>
  );
}
