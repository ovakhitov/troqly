import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EnTete } from "@/components/EnTete";
import { formaterDateRelative, formaterPrix, libellesStatut, urlPhoto, type StatutAnnonce } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { COMMISSION_BPS } from "@/lib/frais";
import { COLONNES_OFFRE, offreUtilisable, prixConvenu, type Offre } from "@/lib/offres";
import { stripeConfigure } from "@/lib/stripe";
import { Achat, type Tarif } from "./Achat";
import { Negociation } from "./Negociation";
import { OffresRecues } from "./OffresRecues";
import { acheter } from "../../commandes/actions";
import { contacterVendeur } from "../../messages/actions";
import { basculerFavori } from "../actions";
import { Galerie } from "./Galerie";
import { GestionAnnonce } from "./GestionAnnonce";
import { Signaler } from "./Signaler";

const boutonPrincipal =
  "block w-full rounded-full bg-action px-6 py-3 font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publiee?: string; contact?: string; achat?: string }>;
};

const ERREURS_ACHAT: Record<string, string> = {
  infos: "Complétez vos informations personnelles dans « Mon compte » avant d'acheter.",
  indisponible: "Cet objet n'est plus disponible à l'achat.",
  mode: "Ce mode de remise n'est pas proposé pour cet objet.",
  vendeur: "Ce vendeur n'a pas encore activé les paiements en ligne. Contactez-le par message.",
  relais: "Indiquez le nom et l'adresse du point relais choisi.",
  offre: "Le prix négocié n'est plus valable. Faites une nouvelle offre au vendeur.",
  erreur: "Le paiement n'a pas pu démarrer. Réessayez dans un instant.",
};

const ID_VALIDE = /^[0-9a-f-]{36}$/;

// cache() : une seule requête partagée entre generateMetadata et la page
const chargerAnnonce = cache(async (id: string) => {
  if (!ID_VALIDE.test(id)) return null;
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("annonces")
    .select(
      "id, vendeur, titre, description, prix_centimes, ville, code_postal, main_propre, livraison, format_colis, statut, moderation, cree_le, categories(libelle), profils!annonces_vendeur_fkey(pseudo, cree_le), photos_annonces(chemin, position)",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const annonce = await chargerAnnonce((await params).id);
  return { title: annonce ? `${annonce.titre} | Troqly` : "Annonce introuvable | Troqly" };
}

export default async function PageAnnonce({ params, searchParams }: Params) {
  const [{ id }, { publiee, contact, achat }] = await Promise.all([params, searchParams]);
  const annonce = await chargerAnnonce(id);
  if (!annonce) notFound();

  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const idMembre = session?.claims?.sub;
  const estVendeur = idMembre === annonce.vendeur;
  // Requêtes indépendantes lancées en parallèle
  const [{ data: favori }, { data: paiementActif }, { data: tarifsData }, { data: offreData }] = await Promise.all([
    idMembre
      ? supabase.from("favoris").select("annonce").eq("membre", idMembre).eq("annonce", id).maybeSingle()
      : Promise.resolve({ data: null }),
    stripeConfigure() ? supabase.rpc("vendeur_paiement_actif", { id_vendeur: annonce.vendeur }) : Promise.resolve({ data: false }),
    // Tarifs d'envoi selon la taille du colis choisie par le vendeur
    annonce.livraison && annonce.format_colis
      ? supabase
          .from("tarifs_livraison")
          .select("id, libelle, mode, prix_centimes, delai")
          .eq("format", annonce.format_colis)
          .eq("actif", true)
          .order("ordre")
      : Promise.resolve({ data: [] }),
    // Négociation en cours de ce membre sur cette annonce
    idMembre && !estVendeur
      ? supabase
          .from("offres")
          .select(COLONNES_OFFRE)
          .eq("annonce", id)
          .eq("acheteur", idMembre)
          .order("cree_le", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tarifs = (tarifsData ?? []) as Tarif[];
  const offreAcheteur = offreData as Offre | null;
  const offreAcceptee =
    offreAcheteur && offreUtilisable(offreAcheteur)
      ? { id: offreAcheteur.id, prix: prixConvenu(offreAcheteur), jusquAu: offreAcheteur.valable_jusqu_au! }
      : null;

  const remisePossible = annonce.main_propre || tarifs.length > 0;
  const achetable =
    Boolean(paiementActif) && remisePossible && annonce.statut === "publiee" && annonce.moderation === "visible";

  const photos = [...(annonce.photos_annonces ?? [])].sort((a, b) => a.position - b.position).map((p) => urlPhoto(p.chemin));
  const statut = annonce.statut as StatutAnnonce;
  const vendeur = annonce.profils as unknown as { pseudo: string; cree_le: string } | null;
  const categorie = annonce.categories as unknown as { libelle: string } | null;

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-20">
        {publiee && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            Votre annonce est publiée.
          </p>
        )}
        {achat && ERREURS_ACHAT[achat] && (
          <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
            {ERREURS_ACHAT[achat]}
          </p>
        )}
        {contact === "impossible" && (
          <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
            Impossible de contacter ce vendeur : l&apos;annonce n&apos;est plus disponible ou l&apos;un de vous a bloqué l&apos;autre.
          </p>
        )}
        {annonce.moderation === "masquee" && (
          <p role="status" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
            Cette annonce a été masquée par la modération : elle n&apos;est plus visible des autres membres.
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid min-w-0 content-start gap-6">
            {/* Sur mobile, le titre et le prix passent avant la galerie (revue Codex) */}
            <div className="grid gap-1 lg:hidden">
              <h1 className="font-titre text-2xl leading-tight font-semibold text-balance text-prune-nuit">{annonce.titre}</h1>
              <p className="font-titre text-2xl font-semibold tabular-nums text-prune-nuit">{formaterPrix(annonce.prix_centimes)}</p>
            </div>
            <Galerie photos={photos} titre={annonce.titre} />
            <section className="grid gap-3">
              <h2 className="font-titre text-lg font-semibold text-prune-nuit">Description</h2>
              <p className="whitespace-pre-line text-prune-nuit">{annonce.description}</p>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <div className="grid gap-4 rounded-carte border border-ligne bg-surface p-5">
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold text-prune-nuit">
                {categorie && <span className="rounded-full border border-ligne px-2.5 py-0.5">{categorie.libelle}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ligne px-2.5 py-0.5">
                  {statut === "publiee" && <i className="size-1.5 rounded-full bg-statut" aria-hidden="true" />}
                  {libellesStatut[statut]}
                </span>
              </div>
              <div className="hidden gap-4 lg:grid">
                <h1 className="font-titre text-2xl leading-tight font-semibold text-balance text-prune-nuit">{annonce.titre}</h1>
                <p className="font-titre text-3xl font-semibold tabular-nums text-prune-nuit">{formaterPrix(annonce.prix_centimes)}</p>
              </div>
              <p className="text-sm text-mauve">
                {annonce.ville} ({annonce.code_postal}) · publiée {formaterDateRelative(annonce.cree_le)}
              </p>
              <ul className="grid gap-1 text-sm text-prune-nuit">
                {annonce.main_propre && <li>Remise en main propre possible</li>}
                {annonce.livraison && <li>Livraison possible</li>}
              </ul>
              {!estVendeur && (
                <div className="grid gap-3">
                  {achetable && idMembre && (
                    <Achat
                      action={acheter.bind(null, annonce.id)}
                      prixCentimes={annonce.prix_centimes}
                      offre={offreAcceptee}
                      mainPropre={annonce.main_propre}
                      tarifs={tarifs}
                      commissionBps={COMMISSION_BPS}
                    />
                  )}
                  {achetable && idMembre && !offreAcceptee && (
                    <Negociation idAnnonce={annonce.id} prixCentimes={annonce.prix_centimes} offre={offreAcheteur} />
                  )}
                  {statut !== "vendue" &&
                    (idMembre ? (
                      <form action={contacterVendeur.bind(null, annonce.id)}>
                        <button
                          type="submit"
                          className={
                            achetable
                              ? "w-full rounded-full border border-ligne px-6 py-3 font-semibold text-prune-nuit transition-colors duration-200 hover:border-prune"
                              : boutonPrincipal
                          }
                        >
                          Contacter le vendeur
                        </button>
                      </form>
                    ) : (
                      <Link href={`/connexion?suivant=/annonces/${annonce.id}`} className={`${boutonPrincipal} text-center`}>
                        {achetable ? "Se connecter pour acheter" : "Se connecter pour contacter"}
                      </Link>
                    ))}
                  {idMembre && (
                    <form action={basculerFavori.bind(null, annonce.id, !favori)}>
                      <button
                        type="submit"
                        aria-pressed={Boolean(favori)}
                        className="w-full rounded-full border border-ligne px-6 py-3 font-semibold text-prune-nuit transition-colors duration-200 hover:border-prune"
                      >
                        {favori ? "Retirer des favoris" : "Ajouter aux favoris"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {vendeur && (
              <div className="grid gap-1 rounded-carte border border-ligne bg-surface p-5">
                <span className="text-xs font-semibold tracking-wider text-mauve uppercase">Vendeur</span>
                <span className="font-titre text-lg font-semibold text-prune-nuit">{vendeur.pseudo}</span>
                <span className="text-sm text-mauve">
                  Membre depuis{" "}
                  {new Date(vendeur.cree_le).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                </span>
              </div>
            )}

            {estVendeur && <OffresRecues idAnnonce={annonce.id} prixCentimes={annonce.prix_centimes} />}
            {estVendeur && <GestionAnnonce id={annonce.id} statut={statut} />}
            {idMembre && !estVendeur && <Signaler idAnnonce={annonce.id} />}

            <Link href="/annonces" className="text-sm font-semibold text-prune hover:underline">
              Retour aux annonces
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
