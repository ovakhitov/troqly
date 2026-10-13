import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { IconeFleche } from "@/components/Icones";
import { PiedDePage } from "@/components/PiedDePage";
import { Volet } from "@/components/Volet";
import { libellesStatut, SELECTION_CARTE, versCarte, type LigneCarte, type StatutAnnonce } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { FormulaireBoutique } from "./FormulaireBoutique";

export const metadata: Metadata = { title: "Ma boutique" };

const ONGLETS: { statut?: StatutAnnonce; libelle: string }[] = [
  { libelle: "Toutes" },
  { statut: "publiee", libelle: "En vente" },
  { statut: "reservee", libelle: libellesStatut.reservee },
  { statut: "vendue", libelle: "Vendues" },
];

export default async function PageMaBoutique({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; supprimee?: string; suivant?: string }>;
}) {
  const { statut, supprimee, suivant } = await searchParams;
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const id = session?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/compte/boutique");

  const [{ data: profil }, { data }] = await Promise.all([
    supabase.from("profils").select("pseudo, ville, boutique_nom, boutique_slug, boutique_description").eq("id", id).single(),
    supabase
      .from("annonces")
      .select(`${SELECTION_CARTE}, moderation`)
      .eq("vendeur", id)
      .order("cree_le", { ascending: false }),
  ]);

  const annonces = (data ?? []) as (LigneCarte & { moderation: string })[];
  const compte = (s?: StatutAnnonce) => (s ? annonces.filter((a) => a.statut === s).length : annonces.length);
  const actif = ONGLETS.find((o) => o.statut === statut) ?? ONGLETS[0];
  const visibles = actif.statut ? annonces.filter((a) => a.statut === actif.statut) : annonces;

  return (
    <div className="flex min-h-screen flex-col">
      <EnTete />
      <main id="contenu" className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-7 px-4 pt-7 pb-20 sm:pt-10">
        <header className="grid gap-3">
          <p className="text-sm font-semibold text-mauve">Ma boutique</p>
          <h1 className="font-titre text-[2rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-[2.5rem]">
            {profil?.boutique_nom ?? "Nommez votre boutique"}
          </h1>
          {profil?.boutique_nom ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-mauve">
                Tenue par {profil.pseudo}
                {profil.ville ? ` · ${profil.ville}` : ""}
              </span>
              <Link
                href={`/boutique/${profil.boutique_slug}`}
                className="inline-flex items-center gap-1 font-semibold text-prune hover:underline"
              >
                Voir comme un acheteur
                <IconeFleche className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="max-w-[56ch] text-mauve">
              Vos annonces sont publiées sous le nom de votre boutique. Il est obligatoire pour vendre, et vous pourrez le
              changer plus tard.
            </p>
          )}
        </header>

        {supprimee && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            L&apos;annonce a été supprimée.
          </p>
        )}

        {profil?.boutique_nom ? (
          <div className="rounded-carte border border-ligne bg-surface px-5 sm:max-w-xl">
            <Volet titre="Nom et présentation" resume={profil.boutique_description ?? "Ajoutez une courte présentation"}>
              <FormulaireBoutique nom={profil.boutique_nom} description={profil.boutique_description ?? ""} />
            </Volet>
          </div>
        ) : (
          <div className="rounded-carte border border-ligne bg-surface p-5 sm:max-w-xl sm:p-7">
            <FormulaireBoutique
              nom=""
              description=""
              suivant={suivant === "/deposer" ? "/deposer" : undefined}
              libelleBouton="Créer ma boutique"
            />
          </div>
        )}

        {profil?.boutique_nom && (
          <section aria-labelledby="titre-annonces" className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="titre-annonces" className="font-titre text-xl font-semibold text-prune-nuit">
                Mes annonces
              </h2>
              <Link href="/deposer" className="bouton min-h-10 px-4 text-sm">
                Déposer une annonce
              </Link>
            </div>

            {annonces.length > 0 && (
              <nav aria-label="Filtrer mes annonces" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
                <ul className="flex w-max gap-2">
                  {ONGLETS.map((o) => (
                    <li key={o.libelle}>
                      <Link
                        href={o.statut ? `/compte/boutique?statut=${o.statut}` : "/compte/boutique"}
                        aria-current={o === actif ? "page" : undefined}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ligne bg-surface px-4 text-sm font-semibold text-prune-nuit aria-[current=page]:border-action aria-[current=page]:bg-action aria-[current=page]:text-sur-action"
                      >
                        {o.libelle}
                        <span className="tabular-nums opacity-70">{compte(o.statut)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {visibles.length === 0 ? (
              <div className="grid justify-items-start gap-2 border-y border-ligne py-8">
                <p className="font-titre text-lg font-semibold text-prune-nuit">
                  {annonces.length === 0 ? "Votre boutique est encore vide." : "Aucune annonce dans cette liste."}
                </p>
                {annonces.length === 0 && <p className="text-mauve">Déposez votre premier objet : c&apos;est gratuit.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {visibles.map((a) => (
                  <div key={a.id} className="grid content-start gap-2">
                    <CarteAnnonce annonce={versCarte(a)} />
                    {a.moderation === "masquee" && (
                      <p className="px-1 text-xs font-semibold text-prune-nuit">Masquée par la modération</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <PiedDePage />
    </div>
  );
}
