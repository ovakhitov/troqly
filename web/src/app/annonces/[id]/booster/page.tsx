import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { formaterPrix } from "@/lib/annonces";
import { FORMULES, libellesStatutBoost, ORDRE_FORMULES, REGLES_BOOST, type FormuleBoost, type StatutBoost } from "@/lib/boosts";
import { boostImpossible, enregistrerPaiementBoost } from "@/lib/boosts-serveur";
import { stripeConfigure } from "@/lib/stripe";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { acheterBoost } from "./actions";

export const metadata: Metadata = { title: "Booster l'annonce", robots: { index: false } };

const ERREURS: Record<string, string> = {
  formule: "Choisissez l'un des trois boosts proposés.",
  compte: "Complétez vos informations dans « Mon compte » avant d'acheter un boost.",
  indisponible: "Seule une annonce disponible et visible peut être boostée.",
  deja: "Ce boost est déjà en cours sur cette annonce.",
  en_cours: "Un paiement est déjà en cours pour ce boost. Réessayez dans un instant.",
  erreur: "Le paiement n'a pas pu démarrer. Réessayez dans un instant.",
};

const dateHeure = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

type Achat = {
  id: string;
  formule: FormuleBoost;
  prix_centimes: number;
  statut: StatutBoost;
  fin: string | null;
  remontees_faites: number;
  motif_fin: string | null;
  cree_le: string;
};

export default async function PageBooster({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ achat?: string; erreur?: string }>;
}) {
  const [{ id }, { achat: idRetour, erreur }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect(`/connexion?suivant=/annonces/${id}/booster`);

  const { data: annonce } = await supabase.from("annonces").select("id, vendeur, titre, statut, moderation").eq("id", id).maybeSingle();
  if (!annonce || annonce.vendeur !== moi) notFound();

  // Retour de Stripe : le paiement est vérifié auprès de Stripe, côté serveur, avant d'activer quoi que ce soit
  if (idRetour && /^[0-9a-f-]{36}$/.test(idRetour) && stripeConfigure()) {
    const { data: s } = await creerClientAdmin()
      .from("achats_boost")
      .select("statut, stripe_session, vendeur")
      .eq("id", idRetour)
      .maybeSingle();
    if (s?.vendeur === moi && s.statut === "en_attente" && s.stripe_session) await enregistrerPaiementBoost(idRetour, s.stripe_session);
  }

  const [{ data: achatsData }, ...empechements] = await Promise.all([
    supabase
      .from("achats_boost")
      .select("id, formule, prix_centimes, statut, fin, remontees_faites, motif_fin, cree_le")
      .eq("annonce", id)
      .neq("statut", "annule")
      .order("cree_le", { ascending: false })
      .limit(20),
    ...ORDRE_FORMULES.map((f) => boostImpossible(id, f)),
  ]);
  const achats = (achatsData ?? []) as Achat[];
  const retour = idRetour ? achats.find((a) => a.id === idRetour) : undefined;
  const paiementsOuverts = stripeConfigure();

  return (
    <CadreCompte titre="Booster l'annonce" intro={annonce.titre} large>
      {retour?.statut === "actif" || retour?.statut === "termine" ? (
        <p role="status" className="rounded-champ border border-statut bg-ivoire px-4 py-3 text-sm text-prune-nuit">
          Paiement confirmé par Stripe : « {FORMULES[retour.formule].nom} » est appliqué à votre annonce.
        </p>
      ) : retour?.statut === "rembourse" ? (
        <p role="alert" className="rounded-champ border border-abricot bg-ivoire px-4 py-3 text-sm text-prune-nuit">
          Le boost n&apos;a pas pu être appliqué ({retour.motif_fin?.toLowerCase()}) : vous êtes remboursé intégralement.
        </p>
      ) : retour?.statut === "en_attente" ? (
        <p role="status" className="rounded-champ border border-ligne bg-ivoire px-4 py-3 text-sm text-prune-nuit">
          Paiement pas encore confirmé par Stripe. Rechargez la page dans quelques secondes.
        </p>
      ) : null}
      {erreur && ERREURS[erreur] && (
        <p role="alert" className="rounded-champ border border-abricot bg-ivoire px-4 py-3 text-sm text-prune-nuit">
          {ERREURS[erreur]}
        </p>
      )}

      <p className="text-[15px] text-prune-nuit">
        Déposer une annonce reste gratuit. Un boost est un achat ponctuel pour mieux placer cette annonce.
      </p>

      <ul className="grid gap-3">
        {ORDRE_FORMULES.map((f, i) => {
          const offre = FORMULES[f];
          const raison = !paiementsOuverts ? "indisponible" : empechements[i];
          return (
            <li key={f} className="grid gap-3 rounded-champ border border-ligne p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="grid gap-1">
                <h2 className="font-titre text-lg font-semibold text-prune-nuit">{offre.nom}</h2>
                <p className="text-sm text-mauve">{offre.description}</p>
                <p className="text-sm font-semibold text-prune-nuit">
                  {formaterPrix(offre.prixCentimes)} · {offre.duree}
                </p>
              </div>
              {raison ? (
                <p className="text-sm text-mauve sm:max-w-[12rem] sm:text-right">
                  {raison === "deja" ? "Déjà en cours sur cette annonce." : "Indisponible pour l'instant."}
                </p>
              ) : (
                <form action={acheterBoost.bind(null, id)}>
                  <input type="hidden" name="formule" value={f} />
                  <button type="submit" className="bouton w-full sm:w-auto">
                    Payer {formaterPrix(offre.prixCentimes)}
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="grid list-disc gap-1 pl-5 text-sm text-mauve">
        {REGLES_BOOST.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      {achats.length > 0 && (
        <section className="grid gap-2 border-t border-ligne pt-5" aria-labelledby="titre-historique">
          <h2 id="titre-historique" className="font-titre text-base font-semibold text-prune-nuit">
            Boosts de cette annonce
          </h2>
          <ul className="grid gap-2 text-sm text-prune-nuit">
            {achats.map((a) => (
              <li key={a.id} className="grid gap-0.5">
                <span>
                  <strong className="font-semibold">{FORMULES[a.formule].nom}</strong> · {formaterPrix(a.prix_centimes)} ·{" "}
                  {libellesStatutBoost[a.statut]}
                </span>
                <span className="text-xs text-mauve">
                  Acheté le {dateHeure.format(new Date(a.cree_le))}
                  {a.statut === "actif" && a.fin && ` · jusqu'au ${dateHeure.format(new Date(a.fin))}`}
                  {a.formule === "visibilite_7j" && a.statut !== "en_attente" && ` · ${a.remontees_faites} remontée(s) sur 7`}
                  {a.motif_fin && ` · ${a.motif_fin}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/annonces/${id}`} className="justify-self-start text-sm font-semibold text-prune hover:underline">
        Retour à l&apos;annonce
      </Link>
    </CadreCompte>
  );
}
