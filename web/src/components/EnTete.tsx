import Link from "next/link";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { ChoixTheme } from "./ChoixTheme";
import { IconeLoupe, LogoTroqly } from "./Icones";
import { NavigationMobile } from "./NavigationMobile";
import { RailSite } from "./RailSite";

async function etatMembre() {
  if (!supabaseEnv()) return { connecte: false, nonLus: 0 };
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { connecte: false, nonLus: 0 };
  const { data: nonLus } = await supabase.rpc("nombre_non_lus");
  return { connecte: true, nonLus: typeof nonLus === "number" ? nonLus : 0 };
}

// Sur grand écran, le rail d'icônes à gauche porte la navigation et la page devient une grande feuille blanche
// (globals.css, .coquille) ; la barre du haut ne garde que la recherche et « Déposer ».
// Sur téléphone, la barre ne garde que le logo et le thème : le reste passe dans la barre d'onglets du bas.
// Sur l'accueil (recherche = false), la barre disparaît sur grand écran : la vitrine a sa propre recherche.
export async function EnTete({ recherche = true }: { recherche?: boolean }) {
  const { connecte, nonLus } = await etatMembre();
  const lien = "text-prune-nuit hover:bg-creux";
  return (
    <>
      <header
        className={`sticky top-0 z-30 px-3 pt-2 sm:px-4 sm:pt-3 lg:px-6 lg:pt-4 ${recherche ? "" : "lg:hidden"}`}
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0.5rem)" }}
      >
        <div className="verre mx-auto max-w-[75rem] rounded-full">
          <div className="flex h-14 items-center gap-2 pr-2 pl-4 sm:h-16 sm:gap-4 sm:pl-5">
            <Link
              href="/"
              className="-ml-1 flex shrink-0 items-center gap-2 rounded-full px-1 text-[1.3rem] font-semibold tracking-[-0.04em] text-prune-nuit lg:hidden"
            >
              <LogoTroqly className="size-6 text-prune" />
              Troqly
            </Link>

            {recherche && (
              <form
                action="/annonces"
                role="search"
                className="hidden h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-ligne bg-surface pr-1 pl-4 text-mauve transition-shadow duration-200 focus-within:border-prune focus-within:shadow-large md:flex lg:max-w-xl"
              >
                <label htmlFor="recherche-entete" className="sr-only">
                  Rechercher une annonce
                </label>
                <input
                  id="recherche-entete"
                  name="q"
                  type="search"
                  placeholder="Vélo, canapé, appareil photo…"
                  className="w-full min-w-0 bg-transparent text-[15px] text-prune-nuit outline-none placeholder:text-mauve"
                />
                <button
                  type="submit"
                  aria-label="Rechercher"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-action text-sur-action transition-colors duration-150 hover:bg-action-survol"
                >
                  <IconeLoupe className="size-4" />
                </button>
              </form>
            )}

            <nav className="ml-auto flex items-center gap-0.5 sm:gap-1" aria-label="Compte">
              {connecte && (
                <Link
                  href="/messages"
                  className={`relative hidden h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors duration-150 sm:inline-flex lg:hidden ${lien}`}
                >
                  Messages
                  {nonLus > 0 && (
                    <span className="inline-grid min-w-5 place-items-center rounded-full bg-action px-1.5 text-xs font-semibold text-sur-action tabular-nums">
                      <span className="sr-only">, non lus : </span>
                      {nonLus > 99 ? "99+" : nonLus}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href={connecte ? "/compte" : "/connexion"}
                className={`hidden h-11 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-150 sm:inline-flex lg:hidden ${lien}`}
              >
                {connecte ? "Mon compte" : "Se connecter"}
              </Link>
              <ChoixTheme className={`lg:hidden ${lien}`} />
              <Link
                href="/deposer"
                className="bouton ml-1 hidden h-11 px-5 text-sm whitespace-nowrap sm:inline-flex"
              >
                Déposer une annonce
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <RailSite connecte={connecte} nonLus={nonLus} />
      <NavigationMobile connecte={connecte} nonLus={nonLus} />
    </>
  );
}
