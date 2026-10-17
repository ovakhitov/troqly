"use client";

import { useEffect, useRef, type RefObject } from "react";

// Outils des scènes « immersives » (d'après le skill site-immersif-skill, adapté au défilement natif de Next.js).
// Une scène épinglée (Objections) est une section haute dont le contenu reste à l'écran (position: sticky) pendant
// qu'on la traverse ; sa progression va de 0 (son haut touche le haut de l'écran) à 1 (son bas touche le bas de l'écran).
// Les scènes légères (Manifeste, Processus) n'utilisent que useTrait : le reste est en CSS.

export const borner = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const melanger = (a: number, b: number, t: number) => a + (b - a) * t;
export const sortie = (t: number) => 1 - Math.pow(1 - t, 3);
export const douce = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Portion [a, b] de la progression, ramenée à 0…1 et éventuellement adoucie
export const tranche = (p: number, a: number, b: number, courbe?: (t: number) => number) => {
  const t = borner((p - a) / (b - a));
  return courbe ? courbe(t) : t;
};

export const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Suit la progression d'une scène et appelle `rendre` à chaque changement, lissée pour un défilement soyeux.
// La progression n'est pas bornée : elle est négative avant l'épinglage (la scène entre à l'écran), ce qui
// permet de faire apparaître le contenu pendant qu'il monte. Rien ne tourne hors écran ni en mouvement réduit.
export function useScene(racine: RefObject<HTMLElement | null>, rendre: (p: number) => void, actif = true) {
  const rappel = useRef(rendre);
  useEffect(() => {
    rappel.current = rendre;
  });

  useEffect(() => {
    const el = racine.current;
    if (!el || !actif || mouvementReduit()) return;
    let image = 0;
    let visible = false;
    let actuelle = Number.NaN;
    let derniere = Number.NaN;
    let avant = 0;

    const viser = () => {
      const r = el.getBoundingClientRect();
      const longueur = Math.max(r.height - window.innerHeight, 1);
      return borner(-r.top / longueur, -1, 2);
    };
    const boucle = (maintenant: number) => {
      const dt = Math.min(maintenant - avant || 16.7, 50);
      avant = maintenant;
      const but = viser();
      // Rattrapage exponentiel, le même à 60 ou 120 images par seconde
      actuelle = Number.isNaN(actuelle) ? but : actuelle + (but - actuelle) * (1 - Math.pow(1 - 0.16, dt / 16.7));
      if (Math.abs(but - actuelle) < 0.0004) actuelle = but;
      if (actuelle !== derniere) {
        derniere = actuelle;
        rappel.current(actuelle);
      }
      image = visible && actuelle !== but ? requestAnimationFrame(boucle) : 0;
    };
    const relancer = () => {
      if (!image && visible) {
        avant = performance.now();
        image = requestAnimationFrame(boucle);
      }
    };
    const observateur = new IntersectionObserver(
      (entrees) => {
        visible = entrees[entrees.length - 1].isIntersecting;
        if (visible) relancer();
      },
      { rootMargin: "50% 0px" },
    );
    observateur.observe(el);
    // Premier rendu immédiat, pour que la scène soit dans le bon état dès son arrivée (retour arrière, ancre)
    actuelle = viser();
    derniere = actuelle;
    rappel.current(actuelle);
    window.addEventListener("scroll", relancer, { passive: true });
    window.addEventListener("resize", relancer);
    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
      window.removeEventListener("scroll", relancer);
      window.removeEventListener("resize", relancer);
    };
  }, [racine, actif]);
}

// Trait SVG qui se dessine (ovale tracé à la main). Avec vector-effect: non-scaling-stroke, Chromium compte les
// pointillés en pixels d'écran : la longueur est donc recalculée à la taille affichée, avec de la marge.
export function creerTrace(chemin: SVGPathElement) {
  let longueur = 1;
  let derniere = 1;
  const mesurer = () => {
    const svg = chemin.ownerSVGElement;
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const sx = (svg.clientWidth || 100) / (vb?.width || 100);
    const sy = (svg.clientHeight || 100) / (vb?.height || 100);
    longueur = chemin.getTotalLength() * Math.max(sx, sy, 1) * 1.25;
    chemin.style.strokeDasharray = String(longueur);
    poser(derniere);
  };
  // reste = 1 : rien de tracé ; reste = 0 : ovale complet
  const poser = (reste: number) => {
    derniere = borner(reste);
    chemin.style.strokeDashoffset = String(longueur * derniere);
    chemin.style.opacity = derniere >= 0.999 ? "0" : "1";
  };
  mesurer();
  return { mesurer, poser };
}

// Trait SVG qui se dessine par une animation CSS liée au défilement (classe .trait, voir globals.css) : le script
// ne fait que donner au style la longueur du trait à sa taille affichée, dans --longueur, et la remesurer si elle change.
export function useTrait(chemin: RefObject<SVGPathElement | null>) {
  useEffect(() => {
    const c = chemin.current;
    const svg = c?.ownerSVGElement;
    if (!c || !svg) return;
    const observateur = new ResizeObserver(() => {
      if (!svg.clientWidth) return;
      const vb = svg.viewBox.baseVal;
      const sx = svg.clientWidth / (vb?.width || 100);
      const sy = svg.clientHeight / (vb?.height || 100);
      // Longueur à l'écran, en suivant le trait point par point : l'ovale est étiré différemment en largeur et en hauteur
      const total = c.getTotalLength();
      let longueur = 0;
      let avant = c.getPointAtLength(0);
      for (let k = 1; k <= 96; k++) {
        const point = c.getPointAtLength((total * k) / 96);
        longueur += Math.hypot((point.x - avant.x) * sx, (point.y - avant.y) * sy);
        avant = point;
      }
      c.style.setProperty("--longueur", `${Math.ceil(longueur * 1.04)}px`);
    });
    observateur.observe(svg);
    return () => observateur.disconnect();
  }, [chemin]);
}

// Le même ovale tracé à la main que le modèle, étiré sur le mot qu'il entoure
export const OVALE = "M50,6 C88,4 98,22 97,50 C96,82 76,96 49,95 C16,94 3,76 4,48 C5,18 20,7 50,6 Z";
