"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { ObjetVerre } from "../ObjetVerre";

// sponsorise : annonce « À la une » (mise en avant contre paiement), signalée par la mention « Sponsorisé »
export type ObjetVitrine = { id: string; titre: string; prix: string; ville: string; photo: string; sponsorise: boolean };

// Emplacements de la constellation : position, taille, inclinaison et profondeur (plus c'est profond, plus ça suit la souris).
// Les deux premiers sont des cartes blanches, les autres des photos seules ; le dernier n'apparaît que sur grand écran.
const places = [
  { carte: true, classe: "left-[1%] top-[14%] w-[36%] sm:left-[5%] sm:top-[16%] sm:w-[16%]", rx: 6, ry: 16, rz: -4, p: 1.25 },
  { carte: true, classe: "right-[1%] top-[4%] w-[36%] sm:right-[5%] sm:top-[8%] sm:w-[16%]", rx: 4, ry: -16, rz: 3, p: 1.25 },
  { carte: false, classe: "left-[34%] top-[52%] w-[30%] sm:left-[21%] sm:top-[2%] sm:w-[11%]", rx: -6, ry: 20, rz: 8, p: 0.7 },
  { carte: false, classe: "hidden sm:block sm:right-[22%] sm:top-[50%] sm:w-[10%]", rx: 8, ry: -18, rz: -7, p: 0.95 },
  { carte: false, classe: "hidden lg:block lg:left-[25%] lg:top-[60%] lg:w-[7.5%]", rx: -4, ry: 12, rz: -10, p: 1.6 },
];

// Même mention que sur CarteAnnonce (Code de la consommation, L111-7)
function Sponsorise() {
  return (
    <span className="verre-fort absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[12px] font-semibold text-abricot">
      Sponsorisé
    </span>
  );
}

// Vitrine de l'accueil, d'après la capture Shop : des objets du moment flottent en perspective autour de l'étiquette
// de verre et suivent légèrement la souris, au-dessus du grand lettrage « troqly ». Sans souris ou si l'appareil
// demande moins d'animations, tout reste immobile.
export function Vitrine({ objets }: { objets: ObjetVitrine[] }) {
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vise = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let image = 0;
    const pas = () => {
      pos.x += (vise.x - pos.x) * 0.08;
      pos.y += (vise.y - pos.y) * 0.08;
      el.style.setProperty("--px", pos.x.toFixed(4));
      el.style.setProperty("--py", pos.y.toFixed(4));
      image = Math.abs(vise.x - pos.x) + Math.abs(vise.y - pos.y) > 0.001 ? requestAnimationFrame(pas) : 0;
    };
    const bouger = (e: PointerEvent) => {
      vise.x = (e.clientX / window.innerWidth - 0.5) * 2;
      vise.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!image) image = requestAnimationFrame(pas);
    };
    window.addEventListener("pointermove", bouger, { passive: true });
    return () => {
      window.removeEventListener("pointermove", bouger);
      cancelAnimationFrame(image);
    };
  }, []);

  return (
    <div ref={scene} className="relative mx-auto aspect-[4/3] w-full max-w-[70rem] [perspective:1400px] sm:aspect-[16/6]" aria-hidden="true">
      <div
        className="arrivee absolute top-[2%] left-1/2 hidden h-[96%] w-[32%] -translate-x-1/2 sm:block"
        style={{ "--arrivee-delai": "250ms" } as CSSProperties}
      >
        <ObjetVerre className="size-full" />
      </div>

      {objets.slice(0, places.length).map((o, i) => {
        const p = places[i];
        return (
          <div
            key={o.id}
            className={`absolute ${p.classe}`}
            style={
              {
                transform: `translate3d(calc(var(--px, 0) * ${18 * p.p}px), calc(var(--py, 0) * ${12 * p.p}px), 0) rotateX(calc(${p.rx}deg + var(--py, 0) * -5deg)) rotateY(calc(${p.ry}deg + var(--px, 0) * 7deg)) rotateZ(${p.rz}deg)`,
                transformStyle: "preserve-3d",
              } as CSSProperties
            }
          >
            <div className="arrivee" style={{ "--arrivee-delai": `${120 + i * 110}ms` } as CSSProperties}>
              <Link
                href={`/annonces/${o.id}`}
                tabIndex={-1}
                className="flotte group block"
                style={{ "--flotte-depart": `-${i * 1.9}s` } as CSSProperties}
              >
                {p.carte ? (
                  <span className="block rounded-[26px] bg-surface p-2 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.35),0_6px_14px_-6px_rgba(0,0,0,0.12)] transition-transform duration-500 ease-verre group-hover:-translate-y-1.5">
                    <span className="relative block aspect-square overflow-hidden rounded-[20px] bg-creux">
                      <Image src={o.photo} alt="" fill sizes="220px" className="object-cover" priority={i < 2} />
                      {o.sponsorise && <Sponsorise />}
                    </span>
                    <span className="block truncate px-1.5 pt-2.5 text-[13px] font-medium tracking-[-0.02em] text-prune-nuit">{o.titre}</span>
                    <span className="flex items-center justify-between gap-2 px-1.5 pt-0.5 pb-1 text-[12px] text-mauve">
                      <span className="truncate">{o.ville}</span>
                      <span className="font-semibold text-prune-nuit tabular-nums">{o.prix}</span>
                    </span>
                  </span>
                ) : (
                  <span className="relative block aspect-square overflow-hidden rounded-[22px] bg-creux shadow-[0_30px_60px_-24px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-verre group-hover:-translate-y-1.5">
                    <Image src={o.photo} alt="" fill sizes="160px" className="object-cover" />
                    {o.sponsorise && <Sponsorise />}
                    <span className="etiquette absolute bottom-1.5 left-1.5 text-[12px]">{o.prix}</span>
                  </span>
                )}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
