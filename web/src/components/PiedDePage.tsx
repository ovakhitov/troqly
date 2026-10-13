import Link from "next/link";
import { LogoTroqly } from "./Icones";

// Pied de page sur l'aplat prune, qui referme chaque page
export function PiedDePage() {
  return (
    <footer className="bg-champ text-sur-champ">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 pt-10 pb-8 sm:gap-10 sm:pt-14 sm:pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 grid content-start gap-3 md:col-span-1">
          <Link href="/" className="flex w-fit items-center gap-2 font-titre text-2xl font-semibold tracking-tight sm:text-3xl">
            <LogoTroqly className="size-7 sm:size-8" />
            Troqly
          </Link>
          <p className="hidden max-w-xs text-sur-champ-doux sm:block">
            Les objets qui dorment chez vous trouvent preneur près de chez vous.
          </p>
        </div>
        <nav aria-label="Annonces" className="grid content-start gap-2.5 text-[15px]">
          <Link href="/annonces" className="w-fit hover:underline">Toutes les annonces</Link>
          <Link href="/deposer" className="w-fit hover:underline">Déposer une annonce</Link>
          <Link href="/compte" className="w-fit hover:underline">Mon compte</Link>
        </nav>
        <nav aria-label="Informations" className="grid content-start gap-2.5 text-[15px]">
          <Link href="/#titre-faq" className="w-fit hover:underline">Questions fréquentes</Link>
          <Link href="/cgu" className="w-fit hover:underline">Conditions d&apos;utilisation</Link>
          <Link href="/confidentialite" className="w-fit hover:underline">Confidentialité</Link>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/15 px-4 py-5 text-sm text-sur-champ-doux sm:py-6">
        © {new Date().getFullYear()} Troqly · Petites annonces entre particuliers en France
      </div>
    </footer>
  );
}
