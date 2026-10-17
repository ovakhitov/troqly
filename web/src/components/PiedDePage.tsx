import Link from "next/link";
import { LogoTroqly } from "./Icones";
import { NomGeant } from "./NomGeant";

// Bande sombre qui referme chaque page : colonnes de liens, puis le nom géant qui monte en rideau
export function PiedDePage() {
  return (
    <footer className="mt-4 overflow-hidden bg-champ text-sur-champ lg:mx-3 lg:mb-3 lg:rounded-[24px]">
      <div className="mx-auto grid max-w-[75rem] grid-cols-2 gap-x-6 gap-y-8 px-4 pt-10 pb-8 sm:gap-10 sm:pt-14 sm:pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="col-span-2 grid content-start gap-3 md:col-span-1">
          <Link href="/" className="flex w-fit items-center gap-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            <LogoTroqly className="size-7 text-[#dcb0de] sm:size-8" />
            Troqly
          </Link>
          <p className="hidden max-w-xs text-sur-champ-doux sm:block">
            Les objets qui dorment chez vous trouvent preneur près de chez vous.
          </p>
        </div>
        <nav aria-label="Annonces" className="grid content-start gap-2.5 text-[15px] text-sur-champ-doux pointer-coarse:gap-0 [&_a:hover]:text-sur-champ">
          <Link href="/annonces" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Toutes les annonces</Link>
          <Link href="/deposer" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Déposer une annonce</Link>
          <Link href="/compte" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Mon compte</Link>
        </nav>
        <nav aria-label="Informations" className="grid content-start gap-2.5 text-[15px] text-sur-champ-doux pointer-coarse:gap-0 [&_a:hover]:text-sur-champ">
          <Link href="/#titre-faq" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Questions fréquentes</Link>
          <Link href="/cgu" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Conditions d&apos;utilisation</Link>
          <Link href="/confidentialite" className="flex w-fit items-center hover:underline pointer-coarse:min-h-11">Confidentialité</Link>
        </nav>
      </div>
      <NomGeant />
      <div className="mx-auto max-w-[75rem] border-t border-white/10 px-4 py-5 text-sm text-sur-champ-doux sm:py-6">
        © {new Date().getFullYear()} Troqly · Petites annonces entre particuliers en France
      </div>
    </footer>
  );
}
