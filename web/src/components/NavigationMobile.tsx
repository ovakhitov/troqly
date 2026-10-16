"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconeBulle, IconeLoupe, IconeMaison, IconePersonne, IconePlus } from "./Icones";

// Barre d'onglets du téléphone : les cinq destinations principales, à portée de pouce.
// La barre du haut ne garde alors que le logo et le thème.
export function NavigationMobile({ connecte, nonLus }: { connecte: boolean; nonLus: number }) {
  const chemin = usePathname();
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(`${href}/`));

  const onglets = [
    { href: "/", libelle: "Accueil", icone: IconeMaison },
    { href: "/annonces", libelle: "Rechercher", icone: IconeLoupe },
    { href: "/deposer", libelle: "Déposer", icone: IconePlus, principal: true },
    { href: "/messages", libelle: "Messages", icone: IconeBulle, badge: connecte ? nonLus : 0 },
    { href: connecte ? "/compte" : "/connexion", libelle: connecte ? "Compte" : "Connexion", icone: IconePersonne },
  ];

  return (
    <nav
      aria-label="Navigation principale"
      className="verre fixed inset-x-0 bottom-0 z-40 rounded-t-[24px] border-b-0 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {onglets.map(({ href, libelle, icone: Icone, principal, badge }) => {
          const courant = actif(href);
          return (
            <li key={libelle} className="grid">
              <Link
                href={href}
                aria-current={courant ? "page" : undefined}
                className={`relative grid place-items-center content-center gap-0.5 text-[11px] font-medium ${
                  courant ? "text-prune-nuit" : "text-mauve"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-colors duration-150 ${
                    principal ? "bg-action text-sur-action shadow-action" : courant ? "bg-creux" : ""
                  }`}
                >
                  <Icone className={principal ? "size-3.5" : "size-[22px]"} />
                </span>
                {libelle}
                {Boolean(badge) && (
                  <span className="absolute top-1 left-1/2 ml-1.5 inline-grid min-w-4.5 place-items-center rounded-full bg-action px-1 text-[10px] leading-4.5 font-semibold text-sur-action tabular-nums">
                    <span className="sr-only">, non lus : </span>
                    {badge! > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
