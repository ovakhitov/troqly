import Link from "next/link";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { IconeBulle, IconeLoupe, IconePersonne, LogoTroqly } from "./Icones";

async function etatMembre() {
  if (!supabaseEnv()) return { connecte: false, nonLus: 0 };
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { connecte: false, nonLus: 0 };
  const { data: nonLus } = await supabase.rpc("nombre_non_lus");
  return { connecte: true, nonLus: typeof nonLus === "number" ? nonLus : 0 };
}

// Reprend la barre de navigation en pilules de Gency, en verre et collante
export async function EnTete() {
  const { connecte, nonLus } = await etatMembre();
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
          {connecte && (
            <Link
              href="/messages"
              className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-prune-nuit transition-colors duration-200 hover:bg-surface sm:px-3"
            >
              <IconeBulle className="size-5 sm:hidden" />
              <span className="sr-only sm:not-sr-only">Messages</span>
              {nonLus > 0 && (
                <span className="inline-grid min-w-5 place-items-center rounded-full bg-action px-1.5 text-xs text-sur-action">
                  <span className="sr-only">, non lus : </span>
                  {nonLus > 99 ? "99+" : nonLus}
                </span>
              )}
            </Link>
          )}
          <Link
            href={connecte ? "/compte" : "/connexion"}
            className="inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-semibold text-prune-nuit transition-colors duration-200 hover:bg-surface sm:px-4"
          >
            <IconePersonne className="size-5 sm:hidden" />
            <span className="sr-only sm:not-sr-only">{connecte ? "Mon compte" : "Se connecter"}</span>
          </Link>
          <Link
            href="/deposer"
            className="inline-flex min-h-11 items-center rounded-full bg-action px-4 text-sm font-semibold whitespace-nowrap text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
          >
            Déposer<span className="sr-only sm:not-sr-only">&nbsp;une annonce</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
