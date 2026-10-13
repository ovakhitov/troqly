import Link from "next/link";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { ChoixTheme } from "./ChoixTheme";
import { IconeLoupe, LogoTroqly } from "./Icones";
import { NavigationMobile } from "./NavigationMobile";

async function etatMembre() {
  if (!supabaseEnv()) return { connecte: false, nonLus: 0 };
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { connecte: false, nonLus: 0 };
  const { data: nonLus } = await supabase.rpc("nombre_non_lus");
  return { connecte: true, nonLus: typeof nonLus === "number" ? nonLus : 0 };
}

// Barre de verre collante. Sur l'accueil, elle flotte sur l'aplat prune (variante « surChamp »).
// Sur téléphone, elle ne garde que le logo et le thème : le reste passe dans la barre d'onglets du bas.
export async function EnTete({ surChamp = false, recherche = true }: { surChamp?: boolean; recherche?: boolean }) {
  const { connecte, nonLus } = await etatMembre();
  const lien = surChamp
    ? "text-sur-champ hover:bg-white/10"
    : "text-prune-nuit hover:bg-creux";
  return (
    <>
      <header
        className={`sticky top-0 z-30 ${surChamp ? "bg-champ" : ""}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className={surChamp ? "" : "verre border-x-0 border-t-0 shadow-none"}>
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:h-16 sm:gap-4">
            <Link
              href="/"
              className={`-ml-1 flex shrink-0 items-center gap-2 rounded-champ px-1 font-titre text-[1.375rem] font-semibold tracking-tight ${
                surChamp ? "text-sur-champ" : "text-prune-nuit"
              }`}
            >
              <LogoTroqly className={`size-6 ${surChamp ? "text-sur-champ" : "text-prune"}`} />
              Troqly
            </Link>

            {recherche && (
              <form
                action="/annonces"
                role="search"
                className="hidden h-11 min-w-0 flex-1 items-center gap-2 rounded-champ border border-ligne bg-surface px-3.5 text-mauve md:flex lg:max-w-md"
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
                  className="w-full min-w-0 bg-transparent text-[15px] text-prune-nuit outline-none placeholder:text-mauve"
                />
              </form>
            )}

            <nav className="ml-auto flex items-center gap-0.5 sm:gap-1" aria-label="Compte">
              {connecte && (
                <Link
                  href="/messages"
                  className={`relative hidden h-11 items-center gap-1.5 rounded-champ px-3 text-sm font-semibold transition-colors duration-150 sm:inline-flex ${lien}`}
                >
                  Messages
                  {nonLus > 0 && (
                    <span className="inline-grid min-w-5 place-items-center rounded-full bg-abricot px-1.5 text-xs font-bold text-white tabular-nums">
                      <span className="sr-only">, non lus : </span>
                      {nonLus > 99 ? "99+" : nonLus}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href={connecte ? "/compte" : "/connexion"}
                className={`hidden h-11 items-center rounded-champ px-3 text-sm font-semibold transition-colors duration-150 sm:inline-flex ${lien}`}
              >
                {connecte ? "Mon compte" : "Se connecter"}
              </Link>
              <ChoixTheme className={lien} />
              <Link
                href="/deposer"
                className={`ml-1 hidden h-11 items-center rounded-champ px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 sm:inline-flex ${
                  surChamp ? "bg-papier text-encre-papier hover:bg-white" : "bg-action text-sur-action hover:bg-action-survol"
                }`}
              >
                Déposer une annonce
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <NavigationMobile connecte={connecte} nonLus={nonLus} />
    </>
  );
}
