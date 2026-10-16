import Link from "next/link";
import { lienStripe } from "@/lib/admin";
import { formaterPrix } from "@/lib/annonces";
import { FORMULES, libellesStatutBoost, type FormuleBoost, type StatutBoost } from "@/lib/boosts";
import { libellesCommande, type StatutCommande } from "@/lib/commandes";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { basculerLitige, debloquerCode, rembourserAchatBoost, rembourserCommande, verserCommande } from "./actions";
import { soldeStripe } from "./argent-stripe";
import { bouton, boutonDanger, boutonFort, CarteChiffre, champ, Confirmer, dateCourte, Filtres, Gerer, RangeeChiffres, Retour, TEINTES, type Teinte, Vide } from "./ui";

const FILTRES = [
  ["toutes", "Toutes"],
  ["payee", "Payées, remise à faire"],
  ["litige", "En litige"],
  ["terminee", "Terminées"],
  ["remboursee", "Remboursées"],
  ["en_attente", "Paiement en attente"],
] as const;

type Commande = {
  id: string;
  titre: string;
  statut: StatutCommande;
  prix_centimes: number;
  frais_service_centimes: number;
  livraison_centimes: number;
  total_centimes: number;
  mode_remise: "main_propre" | "livraison";
  transporteur: string | null;
  numero_suivi: string | null;
  expediee_le: string | null;
  essais_code: number;
  stripe_paiement: string | null;
  cree_le: string;
  acheteur: string | null;
  vendeur: string | null;
  acheteur_profil: { pseudo: string } | null;
  vendeur_profil: { pseudo: string } | null;
};

export async function Argent({ filtre }: { filtre?: string }) {
  const actif = FILTRES.some(([f]) => f === filtre) ? filtre! : "toutes";
  const admin = creerClientAdmin();

  let requete = admin
    .from("commandes")
    .select(
      "id, titre, statut, prix_centimes, frais_service_centimes, livraison_centimes, total_centimes, mode_remise, transporteur, numero_suivi, expediee_le, essais_code, stripe_paiement, cree_le, acheteur, vendeur, acheteur_profil:profils!commandes_acheteur_fkey(pseudo), vendeur_profil:profils!commandes_vendeur_fkey(pseudo)",
    )
    .order("cree_le", { ascending: false })
    .limit(100);
  if (actif !== "toutes") requete = requete.eq("statut", actif);

  const [{ data }, solde, { data: sommes }, { data: boostsData }] = await Promise.all([
    requete,
    soldeStripe(),
    admin.from("commandes").select("statut, total_centimes, frais_service_centimes").in("statut", ["payee", "litige", "terminee"]),
    admin
      .from("achats_boost")
      .select("id, annonce, titre, formule, prix_centimes, statut, fin, motif_fin, stripe_paiement, cree_le, vendeur, vendeur_profil:profils!achats_boost_vendeur_fkey(pseudo)")
      .neq("statut", "annule")
      .order("cree_le", { ascending: false })
      .limit(50),
  ]);
  const boosts = (boostsData ?? []) as unknown as AchatBoost[];
  const boostsEncaisses = boosts.filter((b) => ["actif", "termine", "interrompu"].includes(b.statut)).reduce((t, b) => t + b.prix_centimes, 0);
  const commandes = (data ?? []) as unknown as Commande[];
  const total = (statut: string, champ: "total_centimes" | "frais_service_centimes") =>
    (sommes ?? []).filter((c) => c.statut === statut).reduce((t, c) => t + c[champ], 0);
  const nombre = (statut: string) => (sommes ?? []).filter((c) => c.statut === statut).length;
  const commissions = total("terminee", "frais_service_centimes");
  const retour = `/admin/argent?filtre=${actif}`;

  return (
    <div className="grid gap-6">
      <RangeeChiffres>
        <CarteChiffre libelle="Frais de service encaissés" valeur={formaterPrix(commissions)} detail={`sur ${nombre("terminee")} vente(s) terminée(s)`} teinte="prune" />
        <CarteChiffre
          libelle="Solde Stripe"
          valeur={solde ? formaterPrix(solde.disponible) : "—"}
          detail={solde ? `disponible · ${formaterPrix(solde.aVenir)} à venir` : "Stripe n'est pas joignable"}
          teinte="statut"
        />
        <CarteChiffre
          libelle="En attente de remise"
          valeur={formaterPrix(total("payee", "total_centimes"))}
          detail={`${nombre("payee")} commande(s) payée(s)`}
          teinte="info"
          href="/admin/argent?filtre=payee"
        />
        <CarteChiffre
          libelle="En litige"
          valeur={formaterPrix(total("litige", "total_centimes"))}
          detail={nombre("litige") ? `${nombre("litige")} à régler` : "aucun litige"}
          teinte="alerte"
          href="/admin/argent?filtre=litige"
        />
      </RangeeChiffres>

      <div className="grid gap-3 rounded-carte border border-ligne bg-surface p-5 text-sm text-prune-nuit sm:grid-cols-[1fr_auto] sm:items-center">
        <p>
          Chaque paiement arrive sur le compte Stripe de Troqly. À la fin d&apos;une vente, seule la part du vendeur lui est
          virée (prix et livraison) : les frais de service et les boosts restent dans le solde Stripe, d&apos;où ils partent vers ton compte bancaire. Les frais de carte Stripe sont pris sur ce solde.
        </p>
        <a href={lienStripe("balance/overview")} target="_blank" rel="noreferrer" className={`${bouton} justify-self-start`}>
          Ouvrir Stripe
        </a>
      </div>

      <Filtres options={FILTRES} actif={actif} base="/admin/argent" />

      {!commandes.length ? (
        <Vide texte="Aucune commande ici." />
      ) : (
        <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
          {commandes.map((c) => (
            <li key={c.id} className="grid gap-2 border-b border-ligne p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-0.5">
                <Link href={`/commandes/${c.id}`} className="font-titre font-semibold text-prune hover:underline">
                  {c.titre}
                </Link>
                <span className="text-xs text-mauve">
                  {dateCourte.format(new Date(c.cree_le))} ·{" "}
                  <Pseudo id={c.acheteur} pseudo={c.acheteur_profil?.pseudo} /> achète à{" "}
                  <Pseudo id={c.vendeur} pseudo={c.vendeur_profil?.pseudo} /> ·{" "}
                  {c.mode_remise === "livraison" ? `livraison ${c.transporteur ?? ""}`.trim() : "main propre"}
                </span>
              </div>
              <div className="grid justify-items-start gap-0.5 sm:justify-items-end">
                <span className="font-titre font-semibold text-prune-nuit tabular-nums">{formaterPrix(c.total_centimes)}</span>
                <span className="text-xs text-mauve tabular-nums">frais de service {formaterPrix(c.frais_service_centimes)}</span>
                <Statut statut={c.statut} />
              </div>

              <Gerer>
                <dl className="grid gap-x-6 gap-y-1 text-xs text-prune-nuit sm:grid-cols-4">
                  <Detail libelle="Prix" valeur={formaterPrix(c.prix_centimes)} />
                  <Detail libelle="Frais de service Troqly" valeur={formaterPrix(c.frais_service_centimes)} />
                  <Detail libelle="Livraison" valeur={formaterPrix(c.livraison_centimes)} />
                  <Detail libelle="Payé par l'acheteur" valeur={formaterPrix(c.total_centimes)} />
                  {c.mode_remise === "livraison" && (
                    <Detail libelle="Suivi" valeur={c.numero_suivi ?? (c.expediee_le ? "—" : "pas encore expédié")} />
                  )}
                  {c.mode_remise === "main_propre" && c.statut === "payee" && (
                    <Detail libelle="Essais de code" valeur={`${c.essais_code} sur 5`} />
                  )}
                </dl>

                <div className="flex flex-wrap gap-2">
                  {c.stripe_paiement && (
                    <a href={lienStripe(`payments/${c.stripe_paiement}`)} target="_blank" rel="noreferrer" className={bouton}>
                      Paiement dans Stripe
                    </a>
                  )}
                  {c.statut === "payee" && c.essais_code >= 5 && (
                    <form action={debloquerCode.bind(null, c.id)}>
                      <Retour vers={retour} />
                      <button type="submit" className={bouton}>Redonner 5 essais de code</button>
                    </form>
                  )}
                  {(c.statut === "payee" || c.statut === "litige") && (
                    <form action={basculerLitige.bind(null, c.id, c.statut === "payee")} className="flex flex-wrap gap-2">
                      <Retour vers={retour} />
                      {c.statut === "payee" && (
                        <>
                          <label className="sr-only" htmlFor={`litige-${c.id}`}>Motif du litige</label>
                          <input id={`litige-${c.id}`} name="motif" placeholder="Motif du litige" className={`${champ} w-44`} />
                        </>
                      )}
                      <button type="submit" className={bouton}>
                        {c.statut === "payee" ? "Geler en litige" : "Lever le litige"}
                      </button>
                    </form>
                  )}
                </div>

                {(c.statut === "payee" || c.statut === "litige") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <form action={rembourserCommande.bind(null, c.id)} className="grid content-start gap-2 rounded-champ border border-ligne p-3">
                      <Retour vers={retour} />
                      <label className="sr-only" htmlFor={`remb-${c.id}`}>Motif du remboursement</label>
                      <input id={`remb-${c.id}`} name="motif" placeholder="Motif (journal)" className={champ} />
                      <Confirmer>
                        Je rembourse intégralement l&apos;acheteur ({formaterPrix(c.total_centimes)}). L&apos;annonce redevient
                        disponible.
                      </Confirmer>
                      <button type="submit" className={`${boutonDanger} justify-self-start`}>Rembourser l&apos;acheteur</button>
                    </form>
                    {c.statut === "payee" && (
                      <form action={verserCommande.bind(null, c.id)} className="grid content-start gap-2 rounded-champ border border-ligne p-3">
                        <Retour vers={retour} />
                        <label className="sr-only" htmlFor={`vers-${c.id}`}>Motif du versement</label>
                        <input id={`vers-${c.id}`} name="motif" placeholder="Motif (journal)" className={champ} />
                        <Confirmer>
                          Je termine la vente sans code ni confirmation de l&apos;acheteur et je verse sa part au vendeur.
                        </Confirmer>
                        <button type="submit" className={`${boutonFort} justify-self-start`}>Verser au vendeur</button>
                      </form>
                    )}
                  </div>
                )}
              </Gerer>
            </li>
          ))}
        </ul>
      )}
      {commandes.length === 100 && <p className="text-xs text-mauve">Seules les 100 commandes les plus récentes sont affichées.</p>}

      <section aria-labelledby="titre-boosts" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titre-boosts" className="font-titre text-lg font-semibold tracking-tight text-prune-nuit">Boosts payants</h2>
          <span className="text-xs text-mauve">{formaterPrix(boostsEncaisses)} encaissés sur les 50 derniers achats</span>
        </div>
        {!boosts.length ? (
          <Vide texte="Aucun boost acheté pour l'instant." />
        ) : (
          <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
            {boosts.map((b) => (
              <li key={b.id} className="grid gap-2 border-b border-ligne p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-0.5">
                  {b.annonce ? (
                    <Link href={`/annonces/${b.annonce}`} className="font-titre font-semibold text-prune hover:underline">
                      {b.titre}
                    </Link>
                  ) : (
                    <span className="font-titre font-semibold text-prune-nuit">{b.titre}</span>
                  )}
                  <span className="text-xs text-mauve">
                    {dateCourte.format(new Date(b.cree_le))} · {FORMULES[b.formule].nom} · <Pseudo id={b.vendeur} pseudo={b.vendeur_profil?.pseudo} />
                    {b.statut === "actif" && b.fin && ` · jusqu'au ${dateCourte.format(new Date(b.fin))}`}
                    {b.motif_fin && ` · ${b.motif_fin}`}
                  </span>
                </div>
                <div className="grid justify-items-start gap-0.5 sm:justify-items-end">
                  <span className="font-titre font-semibold text-prune-nuit tabular-nums">{formaterPrix(b.prix_centimes)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TEINTES[b.statut === "actif" ? "info" : b.statut === "termine" ? "statut" : "neutre"].puce}`}>
                    {libellesStatutBoost[b.statut]}
                  </span>
                </div>
                {b.stripe_paiement && ["actif", "termine", "interrompu"].includes(b.statut) && (
                  <Gerer>
                    <form action={rembourserAchatBoost.bind(null, b.id)} className="grid content-start gap-2 rounded-champ border border-ligne p-3 sm:max-w-md">
                      <Retour vers={retour} />
                      <label className="sr-only" htmlFor={`remb-boost-${b.id}`}>Motif du remboursement</label>
                      <input id={`remb-boost-${b.id}`} name="motif" placeholder="Motif (journal)" className={champ} />
                      <Confirmer>
                        Je rembourse {formaterPrix(b.prix_centimes)} au vendeur. Le boost s&apos;arrête aussitôt.
                      </Confirmer>
                      <button type="submit" className={`${boutonDanger} justify-self-start`}>Rembourser le boost</button>
                    </form>
                  </Gerer>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type AchatBoost = {
  id: string;
  annonce: string | null;
  titre: string;
  formule: FormuleBoost;
  prix_centimes: number;
  statut: StatutBoost;
  fin: string | null;
  motif_fin: string | null;
  stripe_paiement: string | null;
  cree_le: string;
  vendeur: string | null;
  vendeur_profil: { pseudo: string } | null;
};

function Pseudo({ id, pseudo }: { id: string | null; pseudo?: string }) {
  if (!id || !pseudo) return <>compte supprimé</>;
  return (
    <Link href={`/admin/membres/${id}`} className="text-prune hover:underline">
      {pseudo}
    </Link>
  );
}

function Detail({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="grid">
      <dt className="text-mauve">{libelle}</dt>
      <dd className="tabular-nums">{valeur}</dd>
    </div>
  );
}

export function Statut({ statut }: { statut: StatutCommande }) {
  const teinte: Teinte = statut === "litige" ? "alerte" : statut === "terminee" ? "statut" : statut === "payee" ? "info" : "neutre";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TEINTES[teinte].puce}`}>{libellesCommande[statut]}</span>;
}
