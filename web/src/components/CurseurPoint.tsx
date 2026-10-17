"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Curseur « point », d'après le composant Originkit Dot Cursor, refait à la main pour Next.js :
// un point qui suit la souris avec un vrai ressort amorti, une traînée effilée qui s'efface derrière lui,
// un anneau au-dessus des boutons et un soulignement sous les liens de texte.
// Il ne s'active qu'avec une souris ou un pavé tactile : jamais sur écran tactile, ni si l'appareil
// demande moins d'animations, ni en mode de contraste élevé, ni dans le tableau de bord.
// Au-dessus d'un champ de saisie, le point s'efface et le curseur texte du système revient.
// Une zone peut le masquer avec data-curseur="masquer", ou demander le soulignement avec data-curseur="lien".

const TAILLE = 14; // diamètre du point, en pixels
const ANNEAU = 46; // diamètre de l'anneau au-dessus d'un bouton
const DUREE_TRAINEE = 200; // durée de vie de la traînée, en millisecondes
const RAIDEUR = 900;
const AMORTI = 2 * Math.sqrt(RAIDEUR) * 0.85; // juste sous l'amorti critique : il rattrape vite, sans rebondir

const INTERACTIFS = 'a[href], button:not(:disabled), [role="button"], [role="tab"], label[for], summary, select, [data-curseur="anneau"]';
const SAISIE =
  'input:not([type="checkbox"], [type="radio"], [type="range"], [type="submit"], [type="button"], [type="file"]), textarea, [contenteditable="true"], [data-curseur="masquer"]';

// Teintes de la prune : foncée sur fond clair, claire sur fond sombre
const SUR_CLAIR = { tete: [90, 42, 90], trainee: [178, 87, 181], halo: [255, 255, 255] };
const SUR_SOMBRE = { tete: [220, 176, 222], trainee: [224, 155, 226], halo: [15, 15, 16] };
type Teintes = typeof SUR_CLAIR;

const rgba = ([r, g, b]: number[], a: number) => `rgba(${r},${g},${b},${a})`;

// Clarté d'une couleur de fond calculée par le navigateur (rgb, oklab ou color()) ; null si elle est transparente
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

export function CurseurPoint() {
  const chemin = usePathname();
  const toile = useRef<HTMLCanvasElement>(null);
  const actif = !chemin.startsWith("/admin");

  useEffect(() => {
    const canvas = toile.current;
    if (!actif || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const souris = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    const contraste = window.matchMedia("(forced-colors: active)");

    let marche = false;
    let image = 0;
    let dernier = 0;
    let largeur = 0;
    let hauteur = 0;
    let present = false;
    let appui = false;
    let teintes: Teintes = SUR_CLAIR;
    let survole: Element | null = null;
    // Fond clair ou sombre de chaque élément survolé, mémorisé jusqu'au prochain changement de thème
    let fonds = new WeakMap<Element, boolean>();

    const vise = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const vitesse = { x: 0, y: 0 };
    const trainee: { x: number; y: number; t: number }[] = [];
    // Forme affichée, qui rejoint la forme visée à chaque image
    const forme = { rayon: TAILLE / 2, anneau: 0, ligne: 0, visible: 0, echelle: 1 };
    const cible = { rayon: TAILLE / 2, anneau: 0, ligne: 0, visible: 0, soulignement: null as DOMRect | null };

    const dimensionner = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      largeur = window.innerWidth;
      hauteur = window.innerHeight;
      canvas.width = Math.round(largeur * ratio);
      canvas.height = Math.round(hauteur * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Premier fond opaque au-dessus de l'élément : sa clarté choisit la teinte du point
    const estSombre = (element: Element) => {
      const connu = fonds.get(element);
      if (connu !== undefined) return connu;
      let sombre = false;
      for (let n: Element | null = element; n; n = n.parentElement) {
        const sombreIci = fondSombre(getComputedStyle(n).backgroundColor);
        if (sombreIci === null) continue;
        sombre = sombreIci;
        break;
      }
      fonds.set(element, sombre);
      return sombre;
    };

    // Ce qui se trouve sous le pointeur décide de la forme et de la teinte
    const analyser = (element: Element | null) => {
      survole = element;
      cible.soulignement = null;
      if (!element || element.closest(SAISIE)) {
        cible.visible = 0;
        return;
      }
      cible.visible = 1;
      teintes = estSombre(element) ? SUR_SOMBRE : SUR_CLAIR;
      const interactif = element.closest(INTERACTIFS) as HTMLElement | null;
      if (!interactif) {
        cible.rayon = TAILLE / 2;
        cible.anneau = 0;
        cible.ligne = 0;
        return;
      }
      // Un lien fait de texte seul (sans fond, sans icône ni image) reçoit le soulignement ; le reste, l'anneau
      const lienTexte =
        interactif.dataset.curseur === "lien" ||
        (interactif.tagName === "A" &&
          !interactif.querySelector("svg, img, picture, canvas, video") &&
          fondSombre(getComputedStyle(interactif).backgroundColor) === null &&
          interactif.getBoundingClientRect().height <= 48);
      const rects = lienTexte ? interactif.getClientRects() : null;
      const texte = rects && rects.length === 1 ? rects[0] : null;
      // Le lien d'une carte s'étire sur toute la carte (pseudo-élément) : survolé loin de son texte, il garde l'anneau
      const surLeTexte =
        texte !== null &&
        vise.x >= texte.left - 8 &&
        vise.x <= texte.right + 8 &&
        vise.y >= texte.top - 8 &&
        vise.y <= texte.bottom + 8;
      if (texte && surLeTexte) {
        cible.soulignement = texte;
        cible.rayon = 3;
        cible.anneau = 0;
        cible.ligne = 1;
      } else {
        cible.rayon = ANNEAU / 2;
        cible.anneau = 1;
        cible.ligne = 0;
      }
    };

    // Rapprochement exponentiel, indépendant du nombre d'images par seconde
    const approcher = (v: number, but: number, dt: number, constante = 70) => v + (but - v) * (1 - Math.exp(-dt / constante));

    const dessinerTrainee = (maintenant: number, force: number) => {
      if (trainee.length < 3 || force < 0.02) return;
      const n = trainee.length;
      const gauche: [number, number][] = [];
      const droite: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const a = trainee[Math.max(i - 1, 0)];
        const b = trainee[Math.min(i + 1, n - 1)];
        const tx = b.x - a.x;
        const ty = b.y - a.y;
        const l = Math.hypot(tx, ty) || 1;
        // Le ruban s'affine vers la queue et vieillit avec le temps
        const vie = 1 - (maintenant - trainee[i].t) / DUREE_TRAINEE;
        const demi = (TAILLE / 2) * 0.85 * Math.pow(i / (n - 1), 0.7) * Math.max(vie, 0);
        gauche.push([trainee[i].x - (ty / l) * demi, trainee[i].y + (tx / l) * demi]);
        droite.push([trainee[i].x + (ty / l) * demi, trainee[i].y - (tx / l) * demi]);
      }
      const queue = trainee[0];
      const tete = trainee[n - 1];
      if (Math.hypot(tete.x - queue.x, tete.y - queue.y) < 2) return;
      const degrade = ctx.createLinearGradient(queue.x, queue.y, tete.x, tete.y);
      degrade.addColorStop(0, rgba(teintes.trainee, 0));
      degrade.addColorStop(1, rgba(teintes.trainee, 0.55 * force));
      ctx.beginPath();
      ctx.moveTo(gauche[0][0], gauche[0][1]);
      for (const [x, y] of gauche) ctx.lineTo(x, y);
      for (let i = droite.length - 1; i >= 0; i--) ctx.lineTo(droite[i][0], droite[i][1]);
      ctx.closePath();
      ctx.fillStyle = degrade;
      ctx.fill();
    };

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

      forme.rayon = approcher(forme.rayon, cible.rayon, dt);
      forme.anneau = approcher(forme.anneau, cible.anneau, dt);
      forme.ligne = approcher(forme.ligne, cible.ligne, dt);
      forme.echelle = approcher(forme.echelle, appui ? 0.78 : 1, dt, 40);
      forme.visible = approcher(forme.visible, present ? cible.visible : 0, dt, 90);

      trainee.push({ x: pos.x, y: pos.y, t: maintenant });
      while (trainee.length && maintenant - trainee[0].t > DUREE_TRAINEE) trainee.shift();

      ctx.clearRect(0, 0, largeur, hauteur);
      ctx.globalAlpha = forme.visible;

      // La traînée s'efface quand le point devient anneau ou soulignement
      dessinerTrainee(maintenant, 1 - Math.max(forme.anneau, forme.ligne));

      // Soulignement qui se déploie depuis le centre du lien
      if (cible.soulignement && forme.ligne > 0.02) {
        const r = cible.soulignement;
        const l = r.width * forme.ligne;
        ctx.fillStyle = rgba(teintes.tete, forme.ligne);
        ctx.fillRect(r.left + (r.width - l) / 2, r.bottom + 1, l, 2);
      }

      // Le point plein s'ouvre en anneau fin au-dessus des boutons ; un liseré le garde visible sur les photos
      const rayon = Math.max(forme.rayon * forme.echelle, 0.5);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rayon, 0, Math.PI * 2);
      const plein = 1 - forme.anneau;
      if (plein > 0.02) {
        ctx.fillStyle = rgba(teintes.tete, plein);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(teintes.halo, 0.55 * plein);
        ctx.stroke();
      }
      if (forme.anneau > 0.02) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = rgba(teintes.halo, 0.35 * forme.anneau);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(teintes.tete, forme.anneau);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Tout est immobile : on s'arrête pour ne rien consommer
      const immobile =
        Math.hypot(vise.x - pos.x, vise.y - pos.y) < 0.2 &&
        Math.hypot(vitesse.x, vitesse.y) < 1 &&
        trainee.length <= 1 &&
        Math.abs(forme.rayon - cible.rayon) < 0.05 &&
        Math.abs(forme.anneau - cible.anneau) < 0.005 &&
        Math.abs(forme.ligne - cible.ligne) < 0.005 &&
        Math.abs(forme.echelle - (appui ? 0.78 : 1)) < 0.005 &&
        Math.abs(forme.visible - (present ? cible.visible : 0)) < 0.005;
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
      if (!present) {
        // Le point naît sous le pointeur, sans traverser l'écran
        pos.x = e.clientX;
        pos.y = e.clientY;
        vitesse.x = vitesse.y = 0;
        trainee.length = 0;
      }
      present = true;
      vise.x = e.clientX;
      vise.y = e.clientY;
      const sous = e.target instanceof Element ? e.target : null;
      if (sous !== survole || cible.soulignement) analyser(sous);
      relancer();
    };
    const appuyer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      appui = true;
      bouger(e);
    };
    const relacher = () => {
      appui = false;
      relancer();
    };
    const sortir = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      present = false;
      relancer();
    };
    const quitter = () => {
      present = false;
      appui = false;
      relancer();
    };
    // Le défilement fait passer la page sous un pointeur immobile
    const defiler = () => {
      if (!present) return;
      analyser(document.elementFromPoint(vise.x, vise.y));
      relancer();
    };

    const demarrer = () => {
      if (marche) return;
      marche = true;
      dimensionner();
      document.documentElement.classList.add("curseur-point");
      window.addEventListener("pointermove", bouger, { passive: true });
      window.addEventListener("pointerdown", appuyer, { passive: true });
      window.addEventListener("pointerup", relacher, { passive: true });
      document.addEventListener("mouseout", sortir);
      window.addEventListener("blur", quitter);
      window.addEventListener("scroll", defiler, { passive: true, capture: true });
      window.addEventListener("resize", dimensionner);
    };
    const arreter = () => {
      if (!marche) return;
      marche = false;
      present = false;
      cancelAnimationFrame(image);
      image = 0;
      ctx.clearRect(0, 0, largeur, hauteur);
      document.documentElement.classList.remove("curseur-point");
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerdown", appuyer);
      window.removeEventListener("pointerup", relacher);
      document.removeEventListener("mouseout", sortir);
      window.removeEventListener("blur", quitter);
      window.removeEventListener("scroll", defiler, { capture: true });
      window.removeEventListener("resize", dimensionner);
    };
    const evaluer = () => (souris.matches && !calme.matches && !contraste.matches ? demarrer() : arreter());
    evaluer();
    for (const m of [souris, calme, contraste]) m.addEventListener("change", evaluer);

    // Changement de thème : les fonds mémorisés ne valent plus
    const relire = () => {
      fonds = new WeakMap();
      if (present) analyser(survole);
      relancer();
    };
    const theme = new MutationObserver(relire);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const sombre = window.matchMedia("(prefers-color-scheme: dark)");
    sombre.addEventListener("change", relire);

    return () => {
      arreter();
      for (const m of [souris, calme, contraste]) m.removeEventListener("change", evaluer);
      theme.disconnect();
      sombre.removeEventListener("change", relire);
    };
  }, [actif]);

  if (!actif) return null;
  return <canvas ref={toile} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] size-full" />;
}
