"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Défilement fluide à la molette (bibliothèque Lenis) : la page glisse puis ralentit en douceur au lieu d'avancer
// par crans. C'est toujours la vraie position de la page qui bouge : les animations liées au défilement, les
// éléments collants et les ancres fonctionnent comme avant. Souris ou pavé tactile seulement : le doigt, le clavier
// et la barre de défilement restent ceux du navigateur, tout comme ce qui défile à l'intérieur de la page (zone de
// texte, rangée de photos) et les fenêtres (<dialog>). Coupé si l'appareil demande moins d'animations et dans le
// tableau de bord. Rien ne tourne au repos : les images ne sont calculées que pendant un glissé.
export function DefilementDoux() {
  const actif = !usePathname().startsWith("/admin");

  useEffect(() => {
    if (!actif) return;
    const souris = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let image = 0;
    // Temps donné à Lenis : il n'avance que pendant un glissé, pour que le premier cran après une pause glisse aussi.
    // Le premier pas d'un geste compte pour une image (l'heure de l'image peut précéder celle du cran de molette, et
    // un écart négatif ferait reculer la page avant qu'elle ne parte), et une image lente compte pour 50 ms au plus :
    // sur un appareil à la peine, le glissé ralentit au lieu d'avancer par bonds.
    let horloge = 0;
    let avant = 0;

    const boucle = (maintenant: number) => {
      horloge += avant ? Math.min(maintenant - avant, 50) : 1000 / 60;
      avant = maintenant;
      lenis?.raf(horloge);
      image = lenis?.isScrolling === "smooth" ? requestAnimationFrame(boucle) : 0;
    };
    const relancer = ({ event }: { event: Event }) => {
      if (event.type !== "wheel") return;
      // Premier cran d'un geste : Lenis repart de la vraie position et de la vraie hauteur de la page, qui ont pu
      // changer sans lui (clavier, lien, autre page, images chargées), pour ne jamais sauter ailleurs
      if (lenis?.isScrolling !== "smooth") lenis?.resize();
      if (image) return;
      avant = 0;
      image = requestAnimationFrame(boucle);
    };
    // Un clic, une touche ou un retour arrière pendant un glissé l'arrête net : la page ne bouge plus sous le
    // pointeur, et la fin du glissé n'annule pas un saut vers une ancre ou le haut de la page suivante.
    // Arrêter puis relancer remet Lenis sur la position réelle de la page, sans la toucher.
    const couper = () => {
      if (lenis?.isScrolling !== "smooth") return;
      lenis.stop();
      lenis.start();
    };

    const demarrer = () => {
      if (lenis) return;
      lenis = new Lenis({
        // Zone de texte ou rangée qui peut encore défiler dans le sens du geste : c'est elle qui défile, normalement
        allowNestedScroll: true,
        prevent: (noeud) => noeud.nodeName === "DIALOG",
      });
      lenis.on("virtual-scroll", relancer);
    };
    const arreter = () => {
      cancelAnimationFrame(image);
      image = 0;
      lenis?.destroy();
      lenis = null;
    };
    const evaluer = () => (souris.matches && !calme.matches ? demarrer() : arreter());
    evaluer();
    for (const m of [souris, calme]) m.addEventListener("change", evaluer);
    for (const e of ["pointerdown", "keydown", "popstate"]) window.addEventListener(e, couper, true);

    return () => {
      arreter();
      for (const m of [souris, calme]) m.removeEventListener("change", evaluer);
      for (const e of ["pointerdown", "keydown", "popstate"]) window.removeEventListener(e, couper, true);
    };
  }, [actif]);

  return null;
}
