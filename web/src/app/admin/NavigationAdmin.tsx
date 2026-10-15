"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChoixTheme } from "@/components/ChoixTheme";
import { LogoTroqly } from "@/components/Icones";
import { IconeApercu, IconeBouclier, IconeComptes, IconeEtiquette, IconeEuro, IconeJournal, IconeRetour } from "./icones";

const SECTIONS = [
  { href: "/admin", libelle: "Tableau de bord", Icone: IconeApercu, teinte: "text-prune bg-prune/12" },
  { href: "/admin/argent", libelle: "Argent", Icone: IconeEuro, teinte: "text-statut bg-statut/12" },
  { href: "/admin/membres", libelle: "Comptes", Icone: IconeComptes, teinte: "text-info bg-info/12" },
  { href: "/admin/annonces", libelle: "Annonces", Icone: IconeEtiquette, teinte: "text-abricot bg-abricot/12" },
  { href: "/moderation", libelle: "Modération", Icone: IconeBouclier, teinte: "text-alerte bg-alerte/12" },
  { href: "/moderation?onglet=journal", libelle: "Journal", Icone: IconeJournal, teinte: "text-mauve bg-mauve/12" },
] as const;

function actif(chemin: string, href: string) {
  if (href === "/admin") return chemin === "/admin";
  return !href.includes("?") && chemin.startsWith(href);
}

// Barre latérale d'icônes (ordinateur) : logo, sections, retour au site, thème et compte
export function BarreLaterale({ initiales }: { initiales: string }) {
  const chemin = usePathname();
  return (
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-[4.5rem] shrink-0 flex-col items-center gap-2 rounded-carte border border-ligne bg-surface py-4 lg:flex">
      <Link href="/admin" className="mb-4 grid size-11 place-items-center rounded-champ bg-action text-sur-action" aria-label="Troqly, tableau de bord">
        <LogoTroqly className="size-6" />
      </Link>
      <nav aria-label="Administration" className="grid gap-1.5">
        {SECTIONS.map(({ href, libelle, Icone }) => {
          const courant = actif(chemin, href);
          return (
            <Link
              key={href}
              href={href}
              title={libelle}
              aria-label={libelle}
              aria-current={courant ? "page" : undefined}
              className={`relative grid size-11 place-items-center rounded-champ transition-colors duration-150 ${
                courant ? "bg-action text-sur-action" : "text-mauve hover:bg-creux hover:text-prune-nuit"
              }`}
            >
              {courant && <span aria-hidden className="absolute -left-[0.95rem] h-6 w-1 rounded-r-full bg-action" />}
              <Icone className="size-5" />
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid justify-items-center gap-1.5">
        <Link href="/" title="Retour au site" aria-label="Retour au site" className="grid size-11 place-items-center rounded-champ text-mauve hover:bg-creux hover:text-prune-nuit">
          <IconeRetour className="size-5" />
        </Link>
        <ChoixTheme className="text-mauve hover:bg-creux hover:text-prune-nuit" />
        <Link
          href="/compte"
          title="Mon compte"
          aria-label="Mon compte"
          className="mt-1 grid size-11 place-items-center rounded-full border border-ligne bg-creux font-titre text-sm font-semibold text-prune-nuit uppercase"
        >
          {initiales}
        </Link>
      </div>
    </aside>
  );
}

// Onglets en haut, dans une pilule ; sur téléphone ils défilent et remplacent la barre latérale
export function OngletsAdmin() {
  const chemin = usePathname();
  return (
    <div className="verre sticky top-2 z-20 flex items-center gap-2 rounded-carte p-1.5 lg:top-4">
      <nav aria-label="Sections" className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1">
        {SECTIONS.map(({ href, libelle, Icone, teinte }) => {
          const courant = actif(chemin, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={courant ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-champ px-2.5 pr-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
                courant ? "bg-surface text-prune-nuit shadow-sm" : "text-mauve hover:bg-surface/70 hover:text-prune-nuit"
              }`}
            >
              <span className={`grid size-7 place-items-center rounded-[8px] ${teinte}`}>
                <Icone className="size-4" />
              </span>
              {libelle}
            </Link>
          );
        })}
      </nav>
      <Link href="/" className="hidden h-10 shrink-0 items-center gap-1.5 rounded-champ px-3 text-sm font-semibold text-mauve hover:text-prune-nuit sm:flex">
        <IconeRetour className="size-4" />
        Retour au site
      </Link>
    </div>
  );
}
