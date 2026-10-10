import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { ReponseOffre } from "@/components/ReponseOffre";
import { formaterDateRelative, formaterPrix } from "@/lib/annonces";
import { COLONNES_OFFRE, libellesOffre, offreUtilisable, prixConvenu, type Offre } from "@/lib/offres";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Négociations | Troqly" };

type Ligne = Offre & {
  annonces: { titre: string } | null;
  acheteur_profil: { pseudo: string } | null;
};

export default async function PageOffres({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect("/connexion?suivant=/offres");

  const { data } = await supabase
    .from("offres")
    .select(`${COLONNES_OFFRE}, annonces(titre), acheteur_profil:profils!offres_acheteur_fkey(pseudo)`)
    .or(`acheteur.eq.${moi},vendeur.eq.${moi}`)
    .order("cree_le", { ascending: false })
    .limit(100);
  const offres = (data ?? []) as unknown as Ligne[];
  const recues = offres.filter((o) => o.vendeur === moi);
  const envoyees = offres.filter((o) => o.acheteur === moi);

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-3xl gap-8 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Négociations</h1>
        {erreur && (
          <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
            {erreur}
          </p>
        )}

        <section className="grid gap-3">
          <h2 className="font-titre text-xl font-semibold text-prune-nuit">Offres reçues</h2>
          {recues.length === 0 ? (
            <p className="rounded-carte border border-ligne bg-surface p-5 text-mauve">Aucune offre reçue pour l&apos;instant.</p>
          ) : (
            <ul className="grid gap-3">
              {recues.map((o) => (
                <li key={o.id} className="grid gap-2 rounded-carte border border-ligne bg-surface p-4">
                  <Link href={`/annonces/${o.annonce}`} className="font-titre font-semibold text-prune hover:underline">
                    {o.annonces?.titre ?? "Annonce"}
                  </Link>
                  {o.statut === "en_attente" ? (
                    <ul>
                      <ReponseOffre offre={o} pseudo={o.acheteur_profil?.pseudo ?? "Membre"} />
                    </ul>
                  ) : (
                    <p className="text-sm text-mauve">
                      {o.acheteur_profil?.pseudo ?? "Membre"} · {formaterPrix(prixConvenu(o))} · {libellesOffre[o.statut]} ·{" "}
                      {formaterDateRelative(o.cree_le)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="font-titre text-xl font-semibold text-prune-nuit">Mes offres</h2>
          {envoyees.length === 0 ? (
            <p className="rounded-carte border border-ligne bg-surface p-5 text-mauve">
              Sur une annonce, utilisez « Faire une offre » pour proposer un prix au vendeur.
            </p>
          ) : (
            <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
              {envoyees.map((o) => (
                <li key={o.id} className="border-b border-ligne last:border-b-0">
                  <Link href={`/annonces/${o.annonce}`} className="flex items-center justify-between gap-4 p-4 hover:bg-ivoire">
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate font-titre font-semibold text-prune-nuit">{o.annonces?.titre ?? "Annonce"}</span>
                      <span className="text-xs text-mauve">
                        {o.statut === "acceptee" && !offreUtilisable(o) ? "Expirée" : libellesOffre[o.statut]} ·{" "}
                        {formaterDateRelative(o.cree_le)}
                      </span>
                    </span>
                    <span className="shrink-0 font-titre font-semibold tabular-nums text-prune-nuit">{formaterPrix(prixConvenu(o))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
