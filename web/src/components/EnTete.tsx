import Link from "next/link";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { IconeLoupe, LogoTroqly } from "./Icones";

async function estConnecte() {
  if (!supabaseEnv()) return false;
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
}

// Reprend la barre de navigation en pilules de Gency, en verre et collante
export async function EnTete() {
  const connecte = await estConnecte();
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 px-4 pt-4">
      <div className="verre mx-auto flex max-w-6xl items-center gap-3 rounded-full py-2 pr-2 pl-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-titre text-xl font-semibold text-prune-nuit"
        >
          <LogoTroqly className="size-6" />
          Troqly
        </Link>

        <form
          action="/annonces"
          role="search"
          className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-ligne bg-surface px-4 py-2 text-mauve md:flex"
        >
          <IconeLoupe className="size-4 shrink-0" />
          <label htmlFor="recherche-entete" className="sr-only">
            Rechercher une annonce
          </label>
          <input
            id="recherche-entete"
            name="q"
            type="search"
            placeholder="Vélo, canapé, appareil photo…"
            className="w-full min-w-0 bg-transparent text-sm text-prune-nuit outline-none placeholder:text-mauve"
          />
        </form>

        <nav className="ml-auto flex items-center gap-2" aria-label="Compte">
          <Link
            href={connecte ? "/compte" : "/connexion"}
            className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-prune-nuit transition-colors duration-200 hover:bg-surface sm:inline-block"
          >
            {connecte ? "Mon compte" : "Se connecter"}
          </Link>
          <Link
            href="/deposer"
            className="rounded-full bg-action px-4 py-2.5 text-sm font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
          >
            Déposer une annonce
          </Link>
        </nav>
      </div>
    </header>
  );
}
