import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { formaterPrix } from "@/lib/annonces";
import { libellesCommande, type StatutCommande } from "@/lib/commandes";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { montantVendeur } from "@/lib/frais";
import { enregistrerPaiement, fraisStripe } from "@/lib/synchro-stripe";
import { annulerEtRembourser, confirmerReception } from "../actions";
import { EnvoiColis } from "./EnvoiColis";
import { SaisieCode } from "./SaisieCode";

export const metadata: Metadata = { title: "Commande | Troqly" };

type Commande = {
  id: string;
  annonce: string | null;
  titre: string;
  acheteur: string | null;
  vendeur: string | null;
  prix_centimes: number;
  frais_service_centimes: number;
  total_centimes: number;
  mode_remise: "main_propre" | "livraison";
  statut: StatutCommande;
  livraison_centimes: number;
  transporteur: string | null;
  mode_livraison: "domicile" | "point_relais" | null;
  point_relais: string | null;
  adresse_livraison: Record<string, string | null> | null;
  numero_suivi: string | null;
  expediee_le: string | null;
};

function adresseEnLignes(a: Record<string, string | null>) {
  return [a.nom, a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" ")].filter(Boolean) as string[];
}

const boutonPrincipal =
  "rounded-full bg-action px-6 py-3 font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]";

export default async function PageCommande({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paiement?: string; terminee?: string; remboursee?: string }>;
}) {
  const [{ id }, retour] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect(`/connexion?suivant=/commandes/${id}`);

  const { data } = await supabase
    .from("commandes")
    .select(
      "id, annonce, titre, acheteur, vendeur, prix_centimes, frais_service_centimes, total_centimes, mode_remise, statut, livraison_centimes, transporteur, mode_livraison, point_relais, adresse_livraison, numero_suivi, expediee_le",
    )
    .eq("id", id)
    .maybeSingle();
  let c = data as Commande | null;
  if (!c) notFound();

  // Retour de Stripe avant la notification (ou sans notification en local) : on vérifie le paiement directement
  if (c.statut === "en_attente" && c.acheteur === moi && retour.paiement) {
    const admin = creerClientAdmin();
    const { data: s } = await admin.from("commandes").select("stripe_session").eq("id", id).single();
    if (s?.stripe_session && (await enregistrerPaiement(id, s.stripe_session))) {
      c = { ...c, statut: "payee" };
    }
  }

  const estAcheteur = c.acheteur === moi;
  const estVendeur = c.vendeur === moi;
  const { data: code } =
    estAcheteur && c.statut === "payee" && c.mode_remise === "main_propre"
      ? await supabase.rpc("code_remise_acheteur", { id_commande: id })
      : { data: null };

  // Montant exact pour le vendeur : frais de carte réels connus dès le paiement
  let pourVendeur: { montant: number; fraisCarte: number } | null = null;
  if (estVendeur && ["payee", "terminee", "litige"].includes(c.statut)) {
    const { data: s } = await creerClientAdmin().from("commandes").select("stripe_charge").eq("id", id).single();
    const fraisCarte = s?.stripe_charge ? await fraisStripe(s.stripe_charge) : null;
    if (fraisCarte !== null) {
      pourVendeur = { fraisCarte, montant: montantVendeur(c.total_centimes, c.frais_service_centimes, fraisCarte) };
    }
  }

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-xl gap-6 px-4 pt-8 pb-20">
        <Link href="/commandes" className="text-sm font-semibold text-prune hover:underline">
          Achats et ventes
        </Link>

        {retour.paiement && c.statut === "en_attente" && (
          <p role="status" className="rounded-champ border border-ligne bg-surface px-4 py-3 text-sm text-prune-nuit">
            Paiement reçu par Stripe, confirmation en cours. Rechargez la page dans quelques secondes.
          </p>
        )}
        {retour.terminee && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            Vente terminée : le paiement est versé au vendeur.
          </p>
        )}
        {retour.remboursee && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            Commande annulée : l&apos;acheteur est remboursé intégralement.
          </p>
        )}

        <section className="grid gap-4 rounded-carte border border-ligne bg-surface p-6">
          <div className="grid gap-1">
            <span className="text-xs font-semibold tracking-wider text-mauve uppercase">
              {estAcheteur ? "Mon achat" : "Ma vente"} · {c.mode_remise === "main_propre" ? "Main propre" : "Livraison"}
            </span>
            <h1 className="font-titre text-2xl font-semibold text-balance text-prune-nuit">
              {c.annonce ? (
                <Link href={`/annonces/${c.annonce}`} className="hover:underline">
                  {c.titre}
                </Link>
              ) : (
                c.titre
              )}
            </h1>
            <span className="text-sm font-semibold text-prune-nuit">{libellesCommande[c.statut]}</span>
          </div>

          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm text-prune-nuit tabular-nums">
            <dt>Prix de l&apos;objet</dt>
            <dd className="text-right">{formaterPrix(c.prix_centimes)}</dd>
            {estAcheteur && (
              <>
                <dt>Frais de service</dt>
                <dd className="text-right">{formaterPrix(c.frais_service_centimes)}</dd>
                {c.livraison_centimes > 0 && (
                  <>
                    <dt>Livraison {c.transporteur}</dt>
                    <dd className="text-right">{formaterPrix(c.livraison_centimes)}</dd>
                  </>
                )}
                <dt className="font-semibold">Total payé</dt>
                <dd className="text-right font-semibold">{formaterPrix(c.total_centimes)}</dd>
              </>
            )}
            {estVendeur && pourVendeur && (
              <>
                {c.livraison_centimes > 0 && (
                  <>
                    <dt>Frais d&apos;envoi payés par l&apos;acheteur</dt>
                    <dd className="text-right">+ {formaterPrix(c.livraison_centimes)}</dd>
                  </>
                )}
                <dt>Frais de paiement par carte</dt>
                <dd className="text-right">− {formaterPrix(pourVendeur.fraisCarte)}</dd>
                <dt className="font-semibold">{c.statut === "terminee" ? "Versé sur votre compte" : "Vous recevrez"}</dt>
                <dd className="text-right font-semibold">{formaterPrix(pourVendeur.montant)}</dd>
              </>
            )}
          </dl>
        </section>

        {c.statut === "payee" && estAcheteur && c.mode_remise === "main_propre" && (
          <section className="grid gap-3 rounded-carte border border-ligne bg-surface p-6">
            <h2 className="font-titre text-lg font-semibold text-prune-nuit">Votre code de remise</h2>
            <p className="font-titre text-4xl font-semibold tracking-[0.3em] tabular-nums text-prune-nuit">{code ?? "······"}</p>
            <p className="text-sm text-mauve">
              Donnez ce code au vendeur seulement quand vous avez l&apos;objet en main et qu&apos;il vous convient. Il déclenche
              le paiement du vendeur.
            </p>
          </section>
        )}

        {c.statut === "payee" && estAcheteur && c.mode_remise === "livraison" && (
          <section className="grid gap-3 rounded-carte border border-ligne bg-surface p-6">
            <p className="text-sm text-prune-nuit">
              {c.expediee_le ? (
                <>
                  Colis expédié par {c.transporteur}. Numéro de suivi : <strong className="tabular-nums">{c.numero_suivi}</strong>
                </>
              ) : (
                <>Le vendeur n&apos;a pas encore expédié le colis ({c.transporteur}).</>
              )}
            </p>
            {c.expediee_le && (
              <>
                <h2 className="font-titre text-lg font-semibold text-prune-nuit">Vous avez reçu l&apos;objet ?</h2>
                <p className="text-sm text-mauve">
                  Confirmez la réception seulement après avoir vérifié l&apos;objet. Le vendeur est alors payé.
                </p>
                <form action={confirmerReception.bind(null, c.id)}>
                  <button type="submit" className={boutonPrincipal}>
                    Confirmer la réception
                  </button>
                </form>
              </>
            )}
          </section>
        )}

        {c.statut === "payee" && estVendeur && (
          <section className="grid gap-4 rounded-carte border border-ligne bg-surface p-6">
            {c.mode_remise === "main_propre" ? (
              <SaisieCode idCommande={c.id} />
            ) : (
              <div className="grid gap-3">
                <h2 className="font-titre text-lg font-semibold text-prune-nuit">
                  À envoyer par {c.transporteur} ({c.mode_livraison === "point_relais" ? "point relais" : "à domicile"})
                </h2>
                <address className="text-sm whitespace-pre-line text-prune-nuit not-italic">
                  {c.mode_livraison === "point_relais"
                    ? c.point_relais
                    : c.adresse_livraison
                      ? adresseEnLignes(c.adresse_livraison).join("\n")
                      : "Adresse en cours de récupération"}
                </address>
                <p className="text-xs text-mauve">
                  Déposez le colis auprès du transporteur : les frais d&apos;envoi payés par l&apos;acheteur vous sont reversés avec
                  le prix. Le paiement vous est versé dès que l&apos;acheteur confirme la réception.
                </p>
                {c.expediee_le ? (
                  <p className="text-sm text-prune-nuit">
                    Expédié. Numéro de suivi : <strong className="tabular-nums">{c.numero_suivi}</strong>
                  </p>
                ) : (
                  <EnvoiColis idCommande={c.id} />
                )}
              </div>
            )}
            <form action={annulerEtRembourser.bind(null, c.id)} className="grid gap-2 border-t border-ligne pt-4">
              <label className="flex items-start gap-2 text-sm text-prune-nuit">
                <input type="checkbox" required className="mt-0.5 size-4 accent-[var(--action)]" />
                Je ne peux pas honorer cette vente et je veux rembourser intégralement l&apos;acheteur.
              </label>
              <button type="submit" className="justify-self-start text-sm font-semibold text-prune hover:underline">
                Annuler et rembourser
              </button>
            </form>
          </section>
        )}

        {(estAcheteur || estVendeur) && c.statut === "payee" && (
          <p className="text-xs text-mauve">Un problème ? Écrivez à l&apos;autre membre depuis vos messages.</p>
        )}
      </main>
    </div>
  );
}
