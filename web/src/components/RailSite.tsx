"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChoixTheme } from "./ChoixTheme";
import { IconeBulle, IconeCoeur, IconeLoupe, IconeMaison, IconePersonne, IconePlus, LogoTroqly } from "./Icones";

// Rail d'icônes à gauche sur grand écran, comme la référence Shop : logo en haut,
// destinations au milieu, thème et compte en bas. Le libellé apparaît en bulle au survol et au clavier.
export function RailSite({ connecte, nonLus }: { connecte: boolean; nonLus: number }) {
  const chemin = usePathname();
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(`${href}/`));

  const destinations = [
    { href: "/", libelle: "Accueil", Icone: IconeMaison },
    { href: "/annonces", libelle: "Rechercher", Icone: IconeLoupe },
    { href: "/deposer", libelle: "Déposer une annonce", Icone: IconePlus, principal: true },
    { href: "/messages", libelle: "Messages", Icone: IconeBulle, badge: connecte ? nonLus : 0 },
    { href: "/compte/favoris", libelle: "Favoris", Icone: IconeCoeur },
  ];

  return (
    <nav aria-label="Navigation principale" className="rail-site fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col items-center py-4 lg:flex">
      <Link href="/" aria-label="Troqly, accueil" className="grid size-12 place-items-center rounded-[20px] text-prune">
        <LogoTroqly className="size-7" />
      </Link>

      <ul className="my-auto grid gap-2">
        {destinations.map(({ href, libelle, Icone, principal, badge }) => {
          const courant = actif(href);
          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-label={libelle}
                aria-current={courant ? "page" : undefined}
                className={`bulle-rail group/rail relative grid size-12 place-items-center rounded-[20px] transition-[background-color,color,transform] duration-200 ease-verre active:scale-95 ${
                  principal
                    ? "bg-action text-sur-action shadow-action hover:bg-action-survol"
                    : courant
                      ? "bg-surface text-prune-nuit shadow-douce"
                      : "text-mauve hover:bg-surface hover:text-prune-nuit"
                }`}
                data-libelle={libelle}
              >
                <Icone className={principal ? "size-4" : "size-[22px]"} />
                {Boolean(badge) && (
                  <span className="absolute top-1.5 right-1.5 inline-grid min-w-4.5 place-items-center rounded-full bg-action px-1 text-[10px] leading-4.5 font-semibold text-sur-action tabular-nums ring-2 ring-ivoire">
                    <span className="sr-only">, non lus : </span>
                    {badge! > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="grid justify-items-center gap-2">
        <ChoixTheme className="size-12 rounded-[20px] text-mauve hover:bg-surface hover:text-prune-nuit" />
        <Link
          href={connecte ? "/compte" : "/connexion"}
          aria-label={connecte ? "Mon compte" : "Se connecter"}
          data-libelle={connecte ? "Mon compte" : "Se connecter"}
          aria-current={actif("/compte") && chemin !== "/compte/favoris" ? "page" : undefined}
          className="bulle-rail grid size-12 place-items-center rounded-[20px] text-mauve transition-colors duration-200 hover:bg-surface hover:text-prune-nuit"
        >
          <span className="grid size-8 place-items-center rounded-full bg-surface ring-1 ring-ligne">
            <IconePersonne className="size-4" />
          </span>
        </Link>
      </div>
    </nav>
  );
}
