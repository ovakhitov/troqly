import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { formaterDateRelative, formaterPrix, libellesStatut, urlPhoto, type StatutAnnonce } from "@/lib/annonces";
import { etatSchemaOrg, lignesCaracteristiques } from "@/lib/caracteristiques";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { URL_SITE } from "@/lib/site";
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
  "bouton w-full";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ publiee?: string; contact?: string; achat?: string }>;
};

const ERREURS_ACHAT: Record<string, string> = {
  infos: "Complétez vos informations personnelles (genre compris) dans « Mon compte » avant d'acheter.",
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
      "id, vendeur, titre, description, prix_centimes, ville, code_postal, main_propre, livraison, format_colis, statut, moderation, cree_le, categorie, caracteristiques, categories(libelle), profils!annonces_vendeur_fkey(pseudo, cree_le, boutique_nom, boutique_slug), photos_annonces(chemin, position)",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const annonce = await chargerAnnonce((await params).id);
  if (!annonce) return { title: "Annonce introuvable", robots: { index: false } };
  const prix = formaterPrix(annonce.prix_centimes);
  const description = `${prix} à ${annonce.ville}. ${annonce.description}`.replace(/\s+/g, " ").slice(0, 160);
  const premiere = [...(annonce.photos_annonces ?? [])].sort((a, b) => a.position - b.position)[0];
  const indexable = annonce.moderation === "visible" && annonce.statut !== "vendue";
  return {
    title: `${annonce.titre} à ${annonce.ville}`,
    description,
    alternates: { canonical: `/annonces/${annonce.id}` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      title: `${annonce.titre} · ${prix}`,
      description,
      url: `/annonces/${annonce.id}`,
      images: premiere ? [{ url: urlPhoto(premiere.chemin), alt: annonce.titre }] : undefined,
    },
  };
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
  const vendeur = annonce.profils as unknown as {
    pseudo: string;
    cree_le: string;
    boutique_nom: string | null;
    boutique_slug: string | null;
  } | null;
  const categorie = annonce.categories as unknown as { libelle: string } | null;
  const caracteristiques = lignesCaracteristiques(annonce.categorie, annonce.caracteristiques);
  const reponses = (annonce.caracteristiques ?? {}) as Record<string, string>;

  // Données structurées : l'objet et son prix, pour les résultats enrichis des moteurs de recherche
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: annonce.titre,
    description: annonce.description,
    image: photos.length ? photos : undefined,
    category: categorie?.libelle,
    itemCondition: etatSchemaOrg(reponses.etat),
    brand: reponses.marque ? { "@type": "Brand", name: reponses.marque } : undefined,
    color: reponses.couleur,
    offers: {
      "@type": "Offer",
      url: `${URL_SITE}/annonces/${annonce.id}`,
      price: (annonce.prix_centimes / 100).toFixed(2),
      priceCurrency: "EUR",
      availability:
        statut === "publiee"
          ? "https://schema.org/InStock"
          : statut === "reservee"
            ? "https://schema.org/LimitedAvailability"
            : "https://schema.org/SoldOut",
      areaServed: { "@type": "Country", name: "FR" },
      seller: vendeur
        ? vendeur.boutique_nom
          ? { "@type": "Organization", name: vendeur.boutique_nom, url: `${URL_SITE}/boutique/${vendeur.boutique_slug}` }
          : { "@type": "Person", name: vendeur.pseudo }
        : undefined,
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      {annonce.moderation === "visible" && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <EnTete />
      <main id="contenu" className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 pt-6 pb-24">
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

        <nav aria-label="Fil d'Ariane" className="text-sm text-mauve">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/annonces" className="hover:text-prune-nuit hover:underline">Annonces</Link>
            </li>
            {categorie && (
              <>
                <li aria-hidden="true">/</li>
                <li>{categorie.libelle}</li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li>{annonce.ville}</li>
          </ol>
        </nav>

        {/* Sur téléphone : titre et prix, photos, puis l'encadré d'achat avant le détail de l'objet */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-8">
          <div className="order-1 grid min-w-0 content-start gap-5 lg:col-start-1 lg:row-start-1">
            {/* Sur mobile, le titre et le prix passent avant la galerie (revue Codex) */}
            <div className="grid justify-items-start gap-3 lg:hidden">
              <h1 className="font-titre text-[1.6rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit">{annonce.titre}</h1>
              <p className="etiquette -rotate-2 text-2xl">{formaterPrix(annonce.prix_centimes)}</p>
            </div>
            <Galerie photos={photos} titre={annonce.titre} />
          </div>

          <div className="order-3 grid min-w-0 content-start gap-8 lg:col-start-1 lg:row-start-2">
            {caracteristiques.length > 0 && (
              <section className="grid gap-3 border-t border-ligne pt-6">
                <h2 className="font-titre text-xl font-semibold text-prune-nuit">Caractéristiques</h2>
                <dl className="grid max-w-2xl grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[15px]">
                  {caracteristiques.map((c) => (
                    <div key={c.libelle} className="contents">
                      <dt className="text-mauve">{c.libelle}</dt>
                      <dd className="font-semibold text-prune-nuit">{c.valeur}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            <section className="grid gap-3 border-t border-ligne pt-6">
              <h2 className="font-titre text-xl font-semibold text-prune-nuit">Description</h2>
              <p className="max-w-[68ch] text-[17px] leading-relaxed whitespace-pre-line text-prune-nuit">{annonce.description}</p>
            </section>
          </div>

          <aside className="order-2 grid content-start gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <div className="grid gap-5 rounded-carte border border-ligne bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold text-prune-nuit">
                {categorie && <span className="rounded-full border border-ligne px-2.5 py-0.5">{categorie.libelle}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-ligne px-2.5 py-0.5">
                  {statut === "publiee" && <i className="size-1.5 rounded-full bg-statut" aria-hidden="true" />}
                  {libellesStatut[statut]}
                </span>
              </div>
              <div className="hidden justify-items-start gap-4 lg:grid">
                <h1 className="font-titre text-[1.75rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit">{annonce.titre}</h1>
                <p className="etiquette -rotate-2 text-[1.75rem]">{formaterPrix(annonce.prix_centimes)}</p>
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
                              ? "w-full bouton-contour"
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
                        className="w-full bouton-contour"
                      >
                        {favori ? "Retirer des favoris" : "Ajouter aux favoris"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {vendeur && (
              <div className="relative flex items-center gap-3 rounded-carte border border-ligne bg-surface p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-champ font-titre text-lg font-semibold text-sur-champ uppercase ring-1 ring-ligne" aria-hidden="true">
                  {(vendeur.boutique_nom ?? vendeur.pseudo).slice(0, 1)}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-titre text-lg leading-tight font-semibold text-prune-nuit">
                    <span className="sr-only">Vendu par : </span>
                    {vendeur.boutique_nom && vendeur.boutique_slug ? (
                      <Link
                        href={`/boutique/${vendeur.boutique_slug}`}
                        className="after:absolute after:inset-0 after:rounded-carte hover:underline"
                      >
                        {vendeur.boutique_nom}
                      </Link>
                    ) : (
                      vendeur.pseudo
                    )}
                  </span>
                  <span className="text-sm text-mauve">
                    {vendeur.boutique_nom ? `${vendeur.pseudo} · ` : ""}
                    membre depuis{" "}
                    {new Date(vendeur.cree_le).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" })}
                  </span>
                </span>
              </div>
            )}

            {estVendeur && <OffresRecues idAnnonce={annonce.id} prixCentimes={annonce.prix_centimes} />}
            {estVendeur && <GestionAnnonce id={annonce.id} statut={statut} />}
            {idMembre && !estVendeur && <Signaler idAnnonce={annonce.id} />}

          </aside>
        </div>
      </main>
      <PiedDePage />
    </div>
  );
}
