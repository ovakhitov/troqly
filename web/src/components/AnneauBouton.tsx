"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Anneau de survol, tiré du composant Originkit Dot Cursor : la flèche normale du système reste, et un anneau prune
// apparaît autour d'elle au-dessus d'un bouton, le suit avec un léger ressort, puis s'efface en quittant le bouton.
// Les liens de texte et les cartes n'en ont pas. Un seul petit élément déplacé par transform : rien ne tourne quand
// la souris ne survole pas de bouton. Souris ou pavé tactile seulement : jamais au doigt, ni si l'appareil demande
// moins d'animations, ni en contraste élevé, ni dans le tableau de bord.
// Un élément peut demander l'anneau avec data-curseur="anneau".

const TAILLE = 46; // diamètre de l'anneau, en pixels
const RAIDEUR = 900;
const AMORTI = 2 * Math.sqrt(RAIDEUR) * 0.85; // juste sous l'amorti critique : il rattrape vite, sans rebondir

const INTERACTIFS = 'a[href], button:not(:disabled), [role="button"], summary, select, [data-curseur="anneau"]';

// Clarté d'une couleur calculée par le navigateur (rgb, oklab ou color()) ; null si elle est (presque) transparente
function fondSombre(couleur: string): boolean | null {
  const n = couleur.match(/-?[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  const alpha = couleur.includes("/") ? n[n.length - 1] : couleur.startsWith("rgba") ? n[3] : 1;
  if (alpha < 0.5) return null;
  if (/^okl(ab|ch)/.test(couleur)) return n[0] < 0.6;
  if (/^l(ab|ch)/.test(couleur)) return n[0] < 55;
  const [r, g, b] = couleur.startsWith("color(") ? n.map((v) => v * 255) : n;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

// Un bouton, une pastille ou un lien-icône : oui. Un lien de texte ou une carte (grande zone cliquable) : non.
function estBouton(el: HTMLElement) {
  if (el.tagName !== "A" || el.dataset.curseur === "anneau") return true;
  if (el.getBoundingClientRect().height > 72) return false;
  const style = getComputedStyle(el);
  const bord = parseFloat(style.borderTopWidth) > 0 && fondSombre(style.borderTopColor) !== null;
  return fondSombre(style.backgroundColor) !== null || bord || el.querySelector("svg") !== null;
}

export function AnneauBouton() {
  const chemin = usePathname();
  const anneau = useRef<HTMLDivElement>(null);
  const actif = !chemin.startsWith("/admin");

  useEffect(() => {
    const el = anneau.current;
    if (!actif || !el) return;
    const souris = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contraste = window.matchMedia("(forced-colors: active)");

    // Mémorisés par élément, jusqu'au prochain changement de thème ou de taille
    let boutons = new WeakMap<Element, boolean>();
    let fonds = new WeakMap<Element, boolean>();

    const vise = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vitesse = { x: 0, y: 0 };
    const forme = { visible: 0, echelle: 0.4 };
    let cible = 0;
    let appui = false;
    let survole: Element | null = null;
    let marche = false;
    let image = 0;
    let dernier = 0;

    // Premier fond opaque, en partant du bouton lui-même : l'anneau passe au lilas sur un bouton ou un fond sombre
    const sombre = (bouton: Element) => {
      const connu = fonds.get(bouton);
      if (connu !== undefined) return connu;
      let resultat = false;
      for (let n: Element | null = bouton; n; n = n.parentElement) {
        const ici = fondSombre(getComputedStyle(n).backgroundColor);
        if (ici === null) continue;
        resultat = ici;
        break;
      }
      fonds.set(bouton, resultat);
      return resultat;
    };

    const analyser = (sous: Element | null) => {
      survole = sous;
      const interactif = sous?.closest<HTMLElement>(INTERACTIFS) ?? null;
      let bouton = false;
      if (interactif) {
        const connu = boutons.get(interactif);
        bouton = connu ?? estBouton(interactif);
        boutons.set(interactif, bouton);
      }
      if (bouton && interactif) el.dataset.fond = sombre(interactif) ? "sombre" : "clair";
      if (bouton && !cible && forme.visible < 0.05) {
        // L'anneau naît sous le pointeur, sans traverser l'écran
        pos.x = vise.x;
        pos.y = vise.y;
        vitesse.x = vitesse.y = 0;
      }
      cible = bouton ? 1 : 0;
    };

    const approcher = (v: number, but: number, dt: number, constante: number) => v + (but - v) * (1 - Math.exp(-dt / constante));

    const dessiner = (maintenant: number) => {
      const dt = Math.min(maintenant - dernier, 50);
      dernier = maintenant;
      // Ressort amorti intégré par petits pas : le même mouvement à 60, 120 ou 144 images par seconde
      let reste = dt / 1000;
      while (reste > 0) {
        const pas = Math.min(reste, 1 / 240);
        vitesse.x += (RAIDEUR * (vise.x - pos.x) - AMORTI * vitesse.x) * pas;
        vitesse.y += (RAIDEUR * (vise.y - pos.y) - AMORTI * vitesse.y) * pas;
        pos.x += vitesse.x * pas;
        pos.y += vitesse.y * pas;
        reste -= pas;
      }
      const echelleVisee = cible ? (appui ? 0.78 : 1) : 0.4;
      forme.visible = approcher(forme.visible, cible, dt, 70);
      forme.echelle = approcher(forme.echelle, echelleVisee, dt, 70);
      el.style.opacity = forme.visible.toFixed(3);
      el.style.transform = `translate3d(${(pos.x - TAILLE / 2).toFixed(1)}px, ${(pos.y - TAILLE / 2).toFixed(1)}px, 0) scale(${forme.echelle.toFixed(3)})`;

      // Plus rien ne bouge : on s'arrête pour ne rien consommer
      const immobile =
        Math.abs(forme.visible - cible) < 0.004 &&
        Math.abs(forme.echelle - echelleVisee) < 0.004 &&
        (cible === 0 || (Math.hypot(vise.x - pos.x, vise.y - pos.y) < 0.2 && Math.hypot(vitesse.x, vitesse.y) < 1));
      if (immobile && cible === 0) el.style.opacity = "0";
      image = immobile ? 0 : requestAnimationFrame(dessiner);
    };

    const relancer = () => {
      if (!image) {
        dernier = performance.now();
        image = requestAnimationFrame(dessiner);
      }
    };

    const bouger = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      vise.x = e.clientX;
      vise.y = e.clientY;
      const sous = e.target instanceof Element ? e.target : null;
      if (sous !== survole) analyser(sous);
      if (cible || forme.visible > 0.004) relancer();
    };
    const appuyer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      appui = true;
      bouger(e);
    };
    const relacher = () => {
      appui = false;
      if (cible) relancer();
    };
    // Défilement, pointeur sorti de la fenêtre : l'anneau s'efface, le prochain mouvement le rappelle
    const effacer = () => {
      survole = null;
      if (!cible) return;
      cible = 0;
      relancer();
    };
    const sortir = (e: MouseEvent) => {
      if (!e.relatedTarget) effacer();
    };
    const oublier = () => {
      boutons = new WeakMap();
      fonds = new WeakMap();
      survole = null;
    };

    const demarrer = () => {
      if (marche) return;
      marche = true;
      window.addEventListener("pointermove", bouger, { passive: true });
      window.addEventListener("pointerdown", appuyer, { passive: true });
      window.addEventListener("pointerup", relacher, { passive: true });
      document.addEventListener("mouseout", sortir);
      window.addEventListener("blur", effacer);
      window.addEventListener("scroll", effacer, { passive: true, capture: true });
      window.addEventListener("resize", oublier);
    };
    const arreter = () => {
      if (!marche) return;
      marche = false;
      cancelAnimationFrame(image);
      image = 0;
      cible = 0;
      forme.visible = 0;
      el.style.opacity = "0";
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerdown", appuyer);
      window.removeEventListener("pointerup", relacher);
      document.removeEventListener("mouseout", sortir);
      window.removeEventListener("blur", effacer);
      window.removeEventListener("scroll", effacer, { capture: true });
      window.removeEventListener("resize", oublier);
    };
    const evaluer = () => (souris.matches && !calme.matches && !contraste.matches ? demarrer() : arreter());
    evaluer();
    for (const m of [souris, calme, contraste]) m.addEventListener("change", evaluer);

    // Changement de thème : les couleurs de fond mémorisées ne valent plus
    const theme = new MutationObserver(oublier);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const systeme = window.matchMedia("(prefers-color-scheme: dark)");
    systeme.addEventListener("change", oublier);

    return () => {
      arreter();
      for (const m of [souris, calme, contraste]) m.removeEventListener("change", evaluer);
      theme.disconnect();
      systeme.removeEventListener("change", oublier);
    };
  }, [actif]);

  if (!actif) return null;
  return <div ref={anneau} aria-hidden="true" className="anneau-bouton" />;
}
