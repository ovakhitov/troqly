"use client";

import { useEffect, useRef } from "react";
import type { Material } from "three";

// Étiquette de prix en verre optique (réfraction, dispersion, irisation), d'après le skill « Premium 3D Glass ».
// Purement décorative : Three.js n'est chargé qu'une fois la page affichée et au repos, l'image s'arrête
// hors de l'écran ou dans un onglet caché, et une seule image fixe est rendue si l'appareil demande moins d'animations.
// Sans WebGL, rien ne s'affiche et la place reste réservée.
export function ObjetVerre({ className = "" }: { className?: string }) {
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const conteneur = cadre.current;
    if (!conteneur) return;
    let arret = () => {};
    let annule = false;

    const demarrer = async () => {
      const THREE = await import("three");
      if (annule) return;

      const essai = document.createElement("canvas");
      if (!essai.getContext("webgl2")) return;

      const calme = window.matchMedia("(prefers-reduced-motion: reduce)");
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      conteneur.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0, 5.6);

      // Studio de panneaux lumineux converti en environnement : ce sont eux qui dessinent les reflets
      const studio = new THREE.Scene();
      studio.background = new THREE.Color("#0a0b0d");
      const panneaux: [number, number, number, number, number, string, number][] = [
        [2.8, 8, -4, 2, 3, "#ffffff", 2.6],
        [0.65, 7, 3, 1, 2, "#e6f0ff", 4.0],
        [5, 0.7, 0, 5, -1, "#ffffff", 3.5],
        [0.5, 6, -2, 0, -4, "#c58bd0", 3.2],
        [1.0, 5, 3, -1, -3, "#ffc9e6", 2.4],
        [4, 0.35, 0, -3, 3, "#a9c4ff", 2.6],
        [0.16, 5, -3, 0, 2, "#ffffff", 5.0],
        [0.35, 4, 4, 0, -2, "#ffbe85", 1.8],
      ];
      for (const [l, h, x, y, z, couleur, intensite] of panneaux) {
        const panneau = new THREE.Mesh(
          new THREE.PlaneGeometry(l, h),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(couleur).multiplyScalar(intensite), side: THREE.DoubleSide }),
        );
        panneau.position.set(x, y, z);
        panneau.lookAt(0, 0, 0);
        studio.add(panneau);
      }
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environnement = pmrem.fromScene(studio, 0.025, 0.1, 100);
      scene.environment = environnement.texture;
      studio.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as Material).dispose();
        }
      });
      pmrem.dispose();

      // Silhouette : une étiquette à bout taillé, coins arrondis, percée de son trou de ficelle
      const forme = new THREE.Shape();
      const r = 0.2;
      forme.moveTo(-1.18, 0.08);
      forme.quadraticCurveTo(-1.24, 0, -1.18, -0.08);
      forme.lineTo(-0.66, -0.6);
      forme.quadraticCurveTo(-0.6, -0.66, -0.5, -0.66);
      forme.lineTo(1.12 - r, -0.66);
      forme.quadraticCurveTo(1.12, -0.66, 1.12, -0.66 + r);
      forme.lineTo(1.12, 0.66 - r);
      forme.quadraticCurveTo(1.12, 0.66, 1.12 - r, 0.66);
      forme.lineTo(-0.5, 0.66);
      forme.quadraticCurveTo(-0.6, 0.66, -0.66, 0.6);
      forme.lineTo(-1.18, 0.08);
      const trou = new THREE.Path();
      trou.absarc(-0.58, 0, 0.17, 0, Math.PI * 2, true);
      forme.holes.push(trou);

      const geometrie = new THREE.ExtrudeGeometry(forme, {
        depth: 0.2,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.08,
        bevelSegments: 8,
        curveSegments: 32,
      });
      geometrie.center();

      const verre = new THREE.MeshPhysicalMaterial({
        color: "#fdfbff",
        metalness: 0,
        roughness: 0.03,
        transmission: 1,
        thickness: 0.45,
        ior: 1.46,
        dispersion: 4,
        attenuationColor: new THREE.Color("#f3e4f4"),
        attenuationDistance: 5,
        clearcoat: 0.65,
        clearcoatRoughness: 0.02,
        iridescence: 0.55,
        iridescenceIOR: 1.3,
        iridescenceThicknessRange: [100, 420],
        envMapIntensity: 1.15,
        side: THREE.DoubleSide,
      });
      const etiquette = new THREE.Mesh(geometrie, verre);
      scene.add(etiquette);

      // Derrière le verre, le logo Troqly en prune : c'est lui que l'étiquette réfracte et décompose
      const dessin = document.createElement("canvas");
      dessin.width = dessin.height = 512;
      const pinceau = dessin.getContext("2d")!;
      // Le logo prend la prune du thème : foncée sur fond clair, claire sur fond sombre
      const dessinerLogo = () => {
        pinceau.setTransform(512 / 26, 0, 0, 512 / 26, 0, 0);
        pinceau.clearRect(0, 0, 26, 26);
        pinceau.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--prune").trim() || "#5a2a5a";
        pinceau.lineWidth = 2.4;
        pinceau.lineCap = "round";
        pinceau.lineJoin = "round";
        pinceau.stroke(new Path2D("M8 7.5a5.5 5.5 0 1 0 0 11h10a5.5 5.5 0 1 0 0-11"));
        pinceau.stroke(new Path2D("M15.5 4.5l3 3-3 3"));
      };
      dessinerLogo();
      const texture = new THREE.CanvasTexture(dessin);
      texture.colorSpace = THREE.SRGBColorSpace;
      const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 1.15),
        new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, toneMapped: false }),
      );
      logo.position.set(0.22, 0, -0.7);
      scene.add(logo);

      // La couleur du fond suit le thème, pour que le verre se fonde dans la page
      const suivreFond = () => {
        // Premier fond opaque au-dessus de l'objet (la feuille blanche sur grand écran, sinon la page)
        let fond = "";
        for (let n: HTMLElement | null = conteneur; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor;
          if (c && c !== "transparent" && !/rgba\(.*,\s*0\)$/.test(c)) {
            fond = c;
            break;
          }
        }
        scene.background = new THREE.Color(fond || getComputedStyle(document.body).backgroundColor);
        dessinerLogo();
        texture.needsUpdate = true;
      };
      suivreFond();

      const dimensionner = () => {
        const { width, height } = conteneur.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      dimensionner();

      // Le pointeur incline légèrement l'objet ; le temps le fait respirer
      const vise = { x: 0, y: 0 };
      const incline = { x: 0, y: 0 };
      const suivrePointeur = (e: PointerEvent) => {
        vise.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
        vise.y = (e.clientY / window.innerHeight - 0.5) * 0.35;
      };

      const poser = (t: number) => {
        incline.x += (vise.x - incline.x) * 0.06;
        incline.y += (vise.y - incline.y) * 0.06;
        etiquette.rotation.y = -0.28 + Math.sin(t * 0.00045) * 0.3 + incline.x;
        etiquette.rotation.x = 0.14 + Math.sin(t * 0.0006) * 0.08 + incline.y;
        etiquette.rotation.z = -0.18 + Math.sin(t * 0.0003) * 0.05;
        etiquette.position.y = Math.sin(t * 0.0009) * 0.06;
      };

      let visible = true;
      let image = 0;
      const boucle = (t: number) => {
        image = 0;
        poser(t);
        renderer.render(scene, camera);
        if (visible && !calme.matches && !document.hidden) image = requestAnimationFrame(boucle);
      };
      const relancer = () => {
        if (!image && visible && !document.hidden) image = requestAnimationFrame(boucle);
      };

      const observateur = new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting;
        relancer();
      });
      observateur.observe(conteneur);
      const taille = new ResizeObserver(() => {
        dimensionner();
        suivreFond();
        relancer();
      });
      taille.observe(conteneur);
      const theme = new MutationObserver(() => {
        suivreFond();
        relancer();
      });
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const sombre = window.matchMedia("(prefers-color-scheme: dark)");
      const changementSysteme = () => {
        suivreFond();
        relancer();
      };
      sombre.addEventListener("change", changementSysteme);
      calme.addEventListener("change", relancer);
      document.addEventListener("visibilitychange", relancer);
      window.addEventListener("pointermove", suivrePointeur, { passive: true });

      // Première image : fixe et de trois quarts si l'appareil demande moins d'animations
      boucle(calme.matches ? 0 : performance.now());
      conteneur.dataset.pret = "";

      arret = () => {
        cancelAnimationFrame(image);
        observateur.disconnect();
        taille.disconnect();
        theme.disconnect();
        sombre.removeEventListener("change", changementSysteme);
        calme.removeEventListener("change", relancer);
        document.removeEventListener("visibilitychange", relancer);
        window.removeEventListener("pointermove", suivrePointeur);
        geometrie.dispose();
        verre.dispose();
        logo.geometry.dispose();
        logo.material.dispose();
        texture.dispose();
        environnement.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // Chargé au repos, après l'affichage : la 3D ne retarde jamais la page ni la recherche
    const lancer = () => void demarrer();
    const repos = typeof window.requestIdleCallback === "function";
    const attente = repos ? window.requestIdleCallback(lancer, { timeout: 2500 }) : setTimeout(lancer, 600);

    return () => {
      annule = true;
      if (repos) window.cancelIdleCallback(attente as number);
      else clearTimeout(attente);
      arret();
    };
  }, []);

  return (
    <div
      ref={cadre}
      aria-hidden="true"
      className={`opacity-0 transition-opacity duration-700 ease-verre data-[pret]:opacity-100 ${className}`}
    />
  );
}
