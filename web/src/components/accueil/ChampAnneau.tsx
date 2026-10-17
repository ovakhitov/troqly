"use client";

import { useEffect, useRef } from "react";

// Champ de capsules lumineuses, d'après le composant Originkit Cursor Ring Field, refait à la main en WebGL :
// un anneau doux suit le pointeur, allume les capsules qu'il traverse et les pousse vers l'extérieur,
// puis elles reviennent se poser. Chaque capsule garde 80 % de sa poussée d'une image à l'autre,
// ce qui la fait dériver au lieu de sauter. L'anneau est calculé depuis la position de repos de chaque capsule,
// pour rester rond au lieu de s'étirer en comète. Sans pointeur (téléphone, souris ailleurs),
// l'anneau se promène tout seul sur deux marches lentes. Décoratif : rien ne s'affiche sans WebGL,
// l'animation s'arrête hors de l'écran et dans un onglet caché, et une seule image fixe est rendue
// si l'appareil demande moins d'animations.

// Rampe de couleurs, de la prune profonde au lilas presque blanc, parcourue par un bruit lent
const RAMPE = [
  [0.42, 0.2, 0.43],
  [0.56, 0.27, 0.58],
  [0.7, 0.34, 0.71],
  [0.86, 0.69, 0.87],
  [0.95, 0.89, 0.96],
];
const ECART = 23; // espacement moyen des capsules, en pixels
const TAILLE = 13; // taille d'une capsule au repos, en pixels
const POUSSEE = 18; // déplacement maximal vers l'extérieur, en pixels
const MEMOIRE = 0.8; // part de la poussée gardée d'une image à l'autre (à 60 images par seconde)

const SOMMETS = `
attribute vec2 a_pos;
attribute float a_angle;
attribute float a_lum;
attribute vec3 a_couleur;
uniform vec2 u_taille_ecran;
uniform float u_taille;
varying float v_angle;
varying float v_lum;
varying vec3 v_couleur;
varying float v_pixels;
void main() {
  vec2 clip = a_pos / u_taille_ecran * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_pixels = u_taille * (0.9 + 0.5 * a_lum);
  gl_PointSize = v_pixels;
  v_angle = a_angle;
  v_lum = a_lum;
  v_couleur = a_couleur;
}`;

const FRAGMENTS = `
precision mediump float;
varying float v_angle;
varying float v_lum;
varying vec3 v_couleur;
varying float v_pixels;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float c = cos(v_angle);
  float s = sin(v_angle);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  // Capsule couchée sur l'axe x : un segment arrondi
  vec2 q = vec2(max(abs(p.x) - 0.6, 0.0), p.y);
  float d = length(q) - 0.2;
  float flou = 2.4 / v_pixels;
  float corps = 1.0 - smoothstep(-flou, flou, d);
  float halo = exp(-max(d, 0.0) * 7.0) * v_lum * v_lum * 0.4;
  float alpha = corps * (0.16 + 0.84 * v_lum) + halo * (1.0 - corps);
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(v_couleur * alpha, alpha);
}`;

// Bruit de simplexe 2D (Gustavson), graine fixe : le même champ à chaque visite
function creerBruit(graine: number) {
  let s = graine >>> 0;
  const alea = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512).map((_, i) => p[i & 255]);
  const G = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const coin = (h: number, x: number, y: number) => {
    let t = 0.5 - x * x - y * y;
    if (t <= 0) return 0;
    t *= t;
    const g = (h & 7) * 2;
    return t * t * (G[g] * x + G[g + 1] * y);
  };
  return (x: number, y: number) => {
    const k = (x + y) * F2;
    const i = Math.floor(x + k);
    const j = Math.floor(y + k);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const ii = i & 255;
    const jj = j & 255;
    return (
      70 *
      (coin(perm[ii + perm[jj]], x0, y0) +
        coin(perm[ii + i1 + perm[jj + j1]], x0 - i1 + G2, y0 - j1 + G2) +
        coin(perm[ii + 1 + perm[jj + 1]], x0 - 1 + 2 * G2, y0 - 1 + 2 * G2))
    );
  };
}

const lisse = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

function compiler(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function ChampAnneau({ className = "" }: { className?: string }) {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = toile.current;
    const zone = canvas?.parentElement;
    if (!canvas || !zone) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return;

    const vs = compiler(gl, gl.VERTEX_SHADER, SOMMETS);
    const fs = compiler(gl, gl.FRAGMENT_SHADER, FRAGMENTS);
    if (!vs || !fs) return;
    const programme = gl.createProgram()!;
    gl.attachShader(programme, vs);
    gl.attachShader(programme, fs);
    gl.linkProgram(programme);
    if (!gl.getProgramParameter(programme, gl.LINK_STATUS)) return;
    gl.useProgram(programme);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
    const PAS = 7 * 4;
    const attribut = (nom: string, taille: number, decalage: number) => {
      const position = gl.getAttribLocation(programme, nom);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, taille, gl.FLOAT, false, PAS, decalage * 4);
    };
    attribut("a_pos", 2, 0);
    attribut("a_angle", 1, 2);
    attribut("a_lum", 1, 3);
    attribut("a_couleur", 3, 4);
    const uTailleEcran = gl.getUniformLocation(programme, "u_taille_ecran");
    const uTaille = gl.getUniformLocation(programme, "u_taille");
    const tailleMax = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] || 64;

    const bruit = creerBruit(7);
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)");

    // État de chaque capsule : position de repos, poussée gardée en mémoire, lumière, angle
    let n = 0;
    let largeur = 0;
    let hauteur = 0;
    let ratio = 1;
    let repos = new Float32Array(0);
    let poussee = new Float32Array(0);
    let lumiere = new Float32Array(0);
    let angles = new Float32Array(0);
    let base = new Float32Array(0);
    let decalage = new Float32Array(0);
    let donnees = new Float32Array(0);

    const semer = () => {
      let s = 12345;
      const alea = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
      const colonnes = Math.ceil(largeur / ECART) + 1;
      const lignes = Math.ceil(hauteur / ECART) + 1;
      n = colonnes * lignes;
      repos = new Float32Array(n * 2);
      poussee = new Float32Array(n * 2);
      lumiere = new Float32Array(n);
      angles = new Float32Array(n);
      base = new Float32Array(n);
      decalage = new Float32Array(n);
      donnees = new Float32Array(n * 7);
      gl.bufferData(gl.ARRAY_BUFFER, donnees.byteLength, gl.DYNAMIC_DRAW);
      // Une grille secouée : réparti sans trou, sans jamais avoir l'air aligné
      for (let l = 0, i = 0; l < lignes; l++) {
        for (let c = 0; c < colonnes; c++, i++) {
          repos[i * 2] = (c - 0.5 + 0.15 + alea() * 0.7) * ECART;
          repos[i * 2 + 1] = (l - 0.5 + 0.15 + alea() * 0.7) * ECART;
          base[i] = 0.08 + alea() * 0.16;
          decalage[i] = (alea() * 2 - 1) * 0.5;
          angles[i] = alea() * Math.PI;
        }
      }
    };

    const dimensionner = () => {
      const { width, height } = zone.getBoundingClientRect();
      if (!width || !height) return false;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      const changement = Math.abs(width - largeur) > 1 || Math.abs(height - hauteur) > 1;
      largeur = width;
      hauteur = height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uTailleEcran, width, height);
      gl.uniform1f(uTaille, Math.min(TAILLE * ratio, tailleMax / 1.4));
      if (changement || !n) semer();
      return true;
    };

    // L'anneau : son centre suit le pointeur, ou se promène quand il n'y en a pas
    const centre = { x: 0, y: 0, pret: false };
    let pointeur: { x: number; y: number } | null = null;
    let toucherJusqua = 0;
    let temps = 0;

    const promenade = (t: number) => ({
      x: largeur * (0.5 + 0.36 * bruit(t * 0.045, 1.7)),
      y: hauteur * (0.5 + 0.32 * bruit(t * 0.038, 8.3)),
    });

    const avancer = (dt: number, maintenant: number) => {
      temps += dt / 1000;
      const t = temps;
      const vise = pointeur && (maintenant < toucherJusqua || toucherJusqua === 0) ? pointeur : promenade(t);
      if (!centre.pret) {
        centre.x = vise.x;
        centre.y = vise.y;
        centre.pret = true;
      }
      const suivi = 1 - Math.exp(-dt / 140);
      centre.x += (vise.x - centre.x) * suivi;
      centre.y += (vise.y - centre.y) * suivi;

      const rayon = Math.min(Math.max(Math.min(largeur, hauteur) * 0.3, 95), 200);
      const bande = rayon * 0.34;
      const garde = Math.pow(MEMOIRE, dt / 16.67);
      const eteint = Math.pow(0.9, dt / 16.67);
      const allume = 1 - Math.pow(0.5, dt / 16.67);
      const tourne = 1 - Math.pow(0.8, dt / 16.67);

      for (let i = 0; i < n; i++) {
        const hx = repos[i * 2];
        const hy = repos[i * 2 + 1];
        const vx = hx - centre.x;
        const vy = hy - centre.y;
        const d = Math.hypot(vx, vy) || 0.001;
        const ux = vx / d;
        const uy = vy / d;
        // Bord de l'anneau qui ondule, pour qu'il respire au lieu d'être un cercle parfait
        const phi = Math.atan2(vy, vx);
        const r = rayon * (1 + 0.06 * Math.sin(3 * phi + t * 0.9) + 0.04 * Math.sin(5 * phi - t * 1.3));
        // Trois paliers lissés de la distance : montée vers l'anneau, descente après, et le cœur adouci
        const monte = lisse(r - bande, r, d);
        const descend = 1 - lisse(r, r + bande * 0.9, d);
        const anneau = monte * descend;
        const coeur = 1 - lisse(0, r * 0.95, d);
        // Au-delà de l'anneau, le champ frémit doucement
        const frisson = Math.sin(d * 0.05 - t * 2.4) * 2.2 * lisse(r * 0.9, r * 1.3, d) * (1 - lisse(r * 1.3, r * 3, d));
        const force = anneau * POUSSEE + frisson;
        poussee[i * 2] = poussee[i * 2] * garde + ux * force * (1 - garde);
        poussee[i * 2 + 1] = poussee[i * 2 + 1] * garde + uy * force * (1 - garde);

        // Lumière : elle s'allume vite au passage de l'anneau et s'éteint lentement derrière lui
        const scintille = 0.05 * bruit(hx * 0.02 + t * 0.35, hy * 0.02);
        const but = base[i] + scintille + anneau * 0.92 + coeur * 0.1;
        lumiere[i] = but > lumiere[i] ? lumiere[i] + (but - lumiere[i]) * allume : lumiere[i] * eteint + but * (1 - eteint);

        // Chaque capsule se tourne vers le centre de l'anneau, avec un écart propre pour éviter l'effet de rayons
        const angleVise = phi + decalage[i] + 0.25 * bruit(hx * 0.004, hy * 0.004 + t * 0.05);
        let ecart = (angleVise - angles[i]) % Math.PI;
        if (ecart > Math.PI / 2) ecart -= Math.PI;
        if (ecart < -Math.PI / 2) ecart += Math.PI;
        angles[i] += ecart * tourne;

        // Couleur : un bruit lent parcourt la rampe
        const k = Math.min(Math.max((bruit(hx * 0.0026 + t * 0.03, hy * 0.0026 - t * 0.02) * 0.5 + 0.5) * 1.05, 0), 1) * (RAMPE.length - 1);
        const a = Math.floor(Math.min(k, RAMPE.length - 2));
        const f = k - a;
        const o = i * 7;
        donnees[o] = hx + poussee[i * 2];
        donnees[o + 1] = hy + poussee[i * 2 + 1];
        donnees[o + 2] = angles[i];
        donnees[o + 3] = Math.min(lumiere[i], 1);
        donnees[o + 4] = RAMPE[a][0] + (RAMPE[a + 1][0] - RAMPE[a][0]) * f;
        donnees[o + 5] = RAMPE[a][1] + (RAMPE[a + 1][1] - RAMPE[a][1]) * f;
        donnees[o + 6] = RAMPE[a][2] + (RAMPE[a + 1][2] - RAMPE[a][2]) * f;
      }
    };

    const peindre = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, donnees);
      gl.drawArrays(gl.POINTS, 0, n);
    };

    // Image fixe : l'anneau posé en haut à droite, capsules déjà revenues au calme
    const imageFixe = () => {
      if (!dimensionner()) return;
      pointeur = { x: largeur * 0.76, y: hauteur * 0.36 };
      toucherJusqua = 0;
      centre.pret = false;
      for (let k = 0; k < 120; k++) avancer(16.67, 0);
      pointeur = null;
      peindre();
    };

    let visible = false;
    let image = 0;
    let dernier = 0;
    const boucle = (maintenant: number) => {
      const dt = Math.min(maintenant - dernier, 50);
      dernier = maintenant;
      avancer(dt, maintenant);
      peindre();
      image = visible && !document.hidden && !calme.matches ? requestAnimationFrame(boucle) : 0;
    };
    const relancer = () => {
      if (calme.matches) {
        cancelAnimationFrame(image);
        image = 0;
        imageFixe();
        return;
      }
      if (!image && visible && !document.hidden && dimensionner()) {
        dernier = performance.now();
        image = requestAnimationFrame(boucle);
      }
    };

    const viser = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      pointeur = { x: e.clientX - r.left, y: e.clientY - r.top };
      // Au doigt, l'anneau rejoint le point touché puis repart se promener
      toucherJusqua = e.pointerType === "touch" ? performance.now() + 1800 : 0;
    };
    const lacher = (e: PointerEvent) => {
      if (e.pointerType !== "touch") pointeur = null;
    };

    const observateur = new IntersectionObserver(
      ([entree]) => {
        visible = entree.isIntersecting;
        relancer();
      },
      { rootMargin: "120px" },
    );
    observateur.observe(zone);
    const taille = new ResizeObserver(() => {
      if (calme.matches) imageFixe();
      else dimensionner();
    });
    taille.observe(zone);
    zone.addEventListener("pointermove", viser, { passive: true });
    zone.addEventListener("pointerdown", viser, { passive: true });
    zone.addEventListener("pointerleave", lacher);
    document.addEventListener("visibilitychange", relancer);
    calme.addEventListener("change", relancer);
    const perdu = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(image);
      image = 0;
      visible = false;
    };
    canvas.addEventListener("webglcontextlost", perdu);

    relancer();
    canvas.dataset.pret = "";

    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
      taille.disconnect();
      zone.removeEventListener("pointermove", viser);
      zone.removeEventListener("pointerdown", viser);
      zone.removeEventListener("pointerleave", lacher);
      document.removeEventListener("visibilitychange", relancer);
      calme.removeEventListener("change", relancer);
      canvas.removeEventListener("webglcontextlost", perdu);
      gl.deleteBuffer(tampon);
      gl.deleteProgram(programme);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={toile}
      aria-hidden="true"
      className={`pointer-events-none size-full opacity-0 transition-opacity duration-1000 ease-verre data-[pret]:opacity-100 ${className}`}
    />
  );
}
