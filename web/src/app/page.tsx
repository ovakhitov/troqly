import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { IconeFleche, IconeLieu, IconeLoupe, IconePlus } from "@/components/Icones";
import { ObjetVerre } from "@/components/ObjetVerre";
import { PiedDePage } from "@/components/PiedDePage";
import { TitreSection } from "@/components/TitreSection";
import { formaterPrix, SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { calculerFrais, COMMISSION_BPS } from "@/lib/frais";
import { DESCRIPTION_SITE, NOM_SITE, URL_SITE } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";

async function chargerAccueil() {
  if (!supabaseEnv()) return { categories: [], annonces: [], boostees: [] };
  const supabase = await creerClientServeur();
  const visibles = () =>
    supabase.from("annonces").select(SELECTION_CARTE).eq("moderation", "visible").neq("statut", "vendue");
  const [{ data: categories }, { data: recentes }, { data: boostees }] = await Promise.all([
    supabase.from("categories").select("slug, libelle").order("ordre"),
    visibles().order("cree_le", { ascending: false }).limit(12),
    visibles().gt("boost_jusqua", new Date().toISOString()).order("boost_jusqua", { ascending: false }).limit(4),
  ]);
  // Une annonce boostée n'apparaît qu'une fois sur l'accueil
  const enAvant = (boostees ?? []).map(versCarte);
  const dejaAffichees = new Set(enAvant.map((a) => a.id));
  return {
    categories: categories ?? [],
    annonces: (recentes ?? []).map(versCarte).filter((a) => !dejaAffichees.has(a.id)).slice(0, 8),
    boostees: enAvant,
  };
}

const etapes = [
  { titre: "Déposez votre annonce.", texte: "Quelques photos, un prix, votre ville : elle est en ligne aussitôt, gratuitement." },
  { titre: "Discutez dans la messagerie.", texte: "Vos coordonnées restent privées jusqu'à la vente. Négociez si vous le souhaitez." },
  { titre: "Remettez ou expédiez.", texte: "En main propre près de chez vous, ou en colis. Le paiement arrive sur votre compte bancaire." },
];

const questions = [
  {
    q: "Combien coûte une vente sur Troqly ?",
    r: "Déposer une annonce est gratuit. L'acheteur qui paie en ligne règle 1,25 % de frais de service. Le vendeur reçoit le prix moins les frais de paiement par carte, et le montant exact lui est affiché dans sa vente.",
  },
  {
    q: "Comment se passe une remise en main propre ?",
    r: "Vous convenez d'un lieu public avec l'acheteur depuis la messagerie. Vérifiez l'objet avant de confirmer la remise.",
  },
  {
    q: "Puis-je faire livrer un objet ?",
    r: "Oui, le vendeur peut proposer la livraison en point relais ou à domicile au moment de déposer l'annonce.",
  },
  {
    q: "Que faire si une annonce me semble frauduleuse ?",
    r: "Utilisez le bouton « Signaler » sur l'annonce. L'équipe de modération l'examine et peut la masquer ou la supprimer.",
  },
];

// Données structurées : le site et sa recherche, pour les moteurs de recherche
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: NOM_SITE,
  url: URL_SITE,
  description: DESCRIPTION_SITE,
  inLanguage: "fr-FR",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${URL_SITE}/annonces?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const auCentime = (centimes: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(centimes / 100);

// Constellation de l'accueil : quatre vraies annonces flottent autour de l'étiquette de verre.
// Les deux cartes extérieures n'apparaissent que sur grand écran.
const constellation = [
  "left-0 top-[26%] w-[15%] -rotate-[4deg] hidden lg:block",
  "left-[3%] lg:left-[16%] top-[2%] w-[24%] lg:w-[18%] rotate-[2deg]",
  "right-[3%] lg:right-[16%] top-[8%] w-[24%] lg:w-[18%] -rotate-[2.5deg]",
  "right-0 top-[34%] w-[15%] rotate-[4deg] hidden lg:block",
];

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ categories, annonces, boostees }, { compte }] = await Promise.all([chargerAccueil(), searchParams]);
  const vitrine = [...boostees, ...annonces].filter((a) => a.photo).slice(0, 4);
  const exemple = calculerFrais(10_000);
  const taux = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(COMMISSION_BPS / 100);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EnTete recherche={false} />

      <main id="contenu">
        {/* Vitrine : des objets du moment qui flottent, la promesse, la recherche et les catégories */}
        <section className="mx-auto max-w-[75rem] px-4 pt-4 pb-12 sm:pt-8 sm:pb-20">
          <div className="relative mx-auto hidden aspect-[16/6] max-w-[60rem] sm:block" aria-hidden="true">
            <ObjetVerre className="absolute top-[4%] left-1/2 h-[92%] w-[34%] -translate-x-1/2" />
            {vitrine.map((a, i) => (
              <Link
                key={a.id}
                href={`/annonces/${a.id}`}
                tabIndex={-1}
                className={`absolute ${constellation[i]}`}
              >
                <span
                  className="flotte carte block rounded-[24px] p-1.5 shadow-large transition-transform duration-500 ease-verre hover:-translate-y-1"
                  style={{ "--flotte-depart": `-${i * 1.7}s` } as CSSProperties}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-creux">
                    <Image src={a.photo!} alt="" fill sizes="200px" className="object-cover" priority={i < 2} />
                    <span className="etiquette absolute bottom-1.5 left-1.5 text-[13px]">{formaterPrix(a.prixCentimes)}</span>
                  </span>
                  <span className="block truncate px-1.5 pt-2 pb-1 text-[13px] font-medium tracking-[-0.015em] text-prune-nuit">
                    {a.titre}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mx-auto grid max-w-[46rem] justify-items-center gap-5 text-center sm:-mt-2 sm:gap-6">
            {/* Sur téléphone, la recherche suffit : le texte reste lu par les lecteurs d'écran et les moteurs */}
            <div className="sr-only sm:not-sr-only sm:grid sm:gap-3">
              <h1 className="mx-auto max-w-[20ch] text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.055em] text-balance text-prune-nuit lg:text-[3.5rem]">
                Ce qui dort au grenier cherche preneur à deux rues d&apos;ici.
              </h1>
              <p className="mx-auto max-w-xl text-lg text-mauve">
                Achetez et vendez entre particuliers, en main propre ou par colis, partout en France.
              </p>
            </div>

            <form
              action="/annonces"
              role="search"
              className="grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded-full border border-prune-nuit/10 bg-surface pr-1.5 pl-5 shadow-carte focus-within:border-prune sm:h-16 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] sm:pr-2 sm:pl-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <IconeLoupe className="size-5 shrink-0 text-mauve" />
                <label htmlFor="recherche-accueil" className="sr-only">
                  Que recherchez-vous ?
                </label>
                <input
                  id="recherche-accueil"
                  name="q"
                  type="search"
                  placeholder="Que recherchez-vous ?"
                  className="w-full min-w-0 bg-transparent text-base text-prune-nuit outline-none placeholder:text-mauve"
                />
              </div>
              {/* Sur téléphone, le lieu se choisit dans les filtres de la recherche */}
              <span className="mx-4 hidden h-7 w-px bg-ligne sm:block" aria-hidden="true" />
              <div className="hidden min-w-0 items-center gap-3 sm:flex">
                <IconeLieu className="size-5 shrink-0 text-mauve" />
                <label htmlFor="lieu-accueil" className="sr-only">
                  Ville, département ou code postal
                </label>
                <input
                  id="lieu-accueil"
                  name="lieu"
                  placeholder="Ville ou code postal"
                  autoComplete="address-level2"
                  className="w-full min-w-0 bg-transparent text-base text-prune-nuit outline-none placeholder:text-mauve"
                />
              </div>
              <button
                type="submit"
                aria-label="Rechercher"
                className="ml-2 grid size-11 place-items-center rounded-full bg-action text-sur-action shadow-action transition-[background-color,transform] duration-150 ease-verre hover:bg-action-survol active:scale-95 sm:size-12"
              >
                <IconeFleche className="size-5 rotate-45" />
              </button>
            </form>

            {categories.length > 0 && (
              <nav
                aria-label="Catégories"
                className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:w-full sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
              >
                {categories.map((c) => (
                  <Link key={c.slug} href={`/annonces?categorie=${c.slug}`} className="pilule text-[15px]">
                    {c.libelle}
                  </Link>
                ))}
              </nav>
            )}

            {compte === "supprime" && (
              <p role="status" className="carte px-5 py-3 text-sm">
                Votre compte et toutes ses données ont été supprimés.
              </p>
            )}
          </div>
        </section>

        <div className="mx-auto grid max-w-[75rem] gap-16 px-4 pb-16 sm:gap-20 sm:pb-24">
          {boostees.length > 0 && (
            <section aria-labelledby="titre-boostees" className="grid gap-5 sm:gap-6">
              <TitreSection id="titre-boostees" titre="Annonces boostées" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {boostees.map((a, i) => (
                  <CarteAnnonce key={a.id} annonce={a} prioritaire={i < 2} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="titre-recentes" className="grid gap-5 sm:gap-6">
            <TitreSection id="titre-recentes" titre="Arrivé ces derniers jours" lien={{ href: "/annonces", libelle: "Toutes les annonces" }} />
            {annonces.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {annonces.map((a) => (
                  <CarteAnnonce key={a.id} annonce={a} />
                ))}
              </div>
            ) : (
              <div className="carte grid justify-items-start gap-3 p-7 sm:p-10">
                <p className="text-xl font-semibold tracking-[-0.03em] text-prune-nuit">Aucune annonce pour l&apos;instant.</p>
                <p className="text-mauve">Les premières annonces apparaîtront ici dès leur publication.</p>
                <Link href="/deposer" className="bouton mt-2">
                  Déposer la première annonce
                </Link>
              </div>
            )}
          </section>

          {/* Les frais montrés sur un exemple chiffré plutôt qu'annoncés */}
          <section
            aria-labelledby="titre-ticket"
            className="carte grid items-start gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16 lg:p-12"
          >
            <div className="grid gap-8">
              <div className="grid gap-3">
                <h2 id="titre-ticket" className="max-w-[18ch] text-[1.875rem] leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-[2.5rem]">
                  Ce que chacun paie, au centime près.
                </h2>
                <p className="max-w-[56ch] text-lg text-mauve">
                  Déposer une annonce ne coûte rien. Quand l&apos;acheteur paie en ligne, il règle {taux} % de frais de
                  service, et c&apos;est tout ce que garde Troqly.
                </p>
              </div>
              <ol className="grid gap-4">
                {etapes.map((e, i) => (
                  <li key={e.titre} className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3">
                    <span
                      className="grid size-7 place-items-center rounded-full bg-ivoire text-sm font-semibold text-prune tabular-nums"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <p className="max-w-[60ch] text-prune-nuit">
                      <span className="font-medium">{e.titre}</span> <span className="text-mauve">{e.texte}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <figure className="rounded-photo bg-ivoire p-6 text-prune-nuit">
              <figcaption className="text-sm font-medium text-mauve">
                Exemple : un objet à {formaterPrix(exemple.prixCentimes)}
              </figcaption>
              <dl className="mt-5 grid gap-3 text-[15px] tabular-nums">
                <div className="flex justify-between gap-4">
                  <dt>Prix de l&apos;objet</dt>
                  <dd>{formaterPrix(exemple.prixCentimes).replace(/ €|\s€/, ",00 €")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Frais de service ({taux} %)</dt>
                  <dd>{auCentime(exemple.fraisServiceCentimes)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-ligne pt-3 text-lg font-semibold tracking-[-0.02em]">
                  <dt>L&apos;acheteur paie</dt>
                  <dd>{auCentime(exemple.totalCentimes)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-mauve">
                Le vendeur reçoit {formaterPrix(exemple.prixCentimes)} moins les frais de carte bancaire. Le montant exact
                lui est affiché dans sa vente. Pour un envoi en colis, la livraison s&apos;ajoute au prix payé par
                l&apos;acheteur.
              </p>
            </figure>
          </section>

          <section aria-labelledby="titre-faq" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <h2 id="titre-faq" className="text-[1.875rem] leading-tight font-semibold tracking-[-0.045em] sm:text-[2.5rem]">
              Questions fréquentes
            </h2>
            <div className="carte px-5 sm:px-7">
              {questions.map(({ q, r }) => (
                <details key={q} className="group border-b border-ligne last:border-b-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-medium tracking-[-0.02em] text-prune-nuit [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ivoire text-prune-nuit transition-transform duration-200 ease-verre group-open:rotate-45">
                      <IconePlus className="size-3" />
                    </span>
                  </summary>
                  <p className="max-w-[62ch] pb-6 text-mauve">{r}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <PiedDePage />
    </>
  );
}
