import Image from "next/image";
import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { IconeLieu, IconeLoupe, IconePlus } from "@/components/Icones";
import { PiedDePage } from "@/components/PiedDePage";
import { TitreSection } from "@/components/TitreSection";
import { formaterPrix, SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { calculerFrais, COMMISSION_BPS } from "@/lib/frais";
import { DESCRIPTION_SITE, NOM_SITE, URL_SITE } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";

async function chargerAccueil() {
  if (!supabaseEnv()) return { categories: [], annonces: [] };
  const supabase = await creerClientServeur();
  const [{ data: categories }, { data: annonces }] = await Promise.all([
    supabase.from("categories").select("slug, libelle").order("ordre"),
    supabase
      .from("annonces")
      .select(SELECTION_CARTE)
      .eq("moderation", "visible")
      .neq("statut", "vendue")
      .order("cree_le", { ascending: false })
      .limit(8),
  ]);
  return { categories: categories ?? [], annonces: (annonces ?? []).map(versCarte) };
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

// Inclinaisons des photos posées sur l'aplat, comme sur une table de vide-grenier
const pile = [
  "left-0 top-[2%] w-[49%] -rotate-[5deg]",
  "left-[12%] bottom-[1%] w-[49%] -rotate-[1.5deg]",
  "right-0 top-[24%] w-[47%] rotate-[4deg]",
];

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ categories, annonces }, { compte }] = await Promise.all([chargerAccueil(), searchParams]);
  const vitrine = annonces.filter((a) => a.photo).slice(0, 3);
  const exemple = calculerFrais(10_000);
  const taux = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(COMMISSION_BPS / 100);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EnTete surChamp recherche={false} />

      <main id="contenu">
        {/* Aplat prune : la promesse, la recherche et de vrais objets du moment */}
        <section className="bg-champ text-sur-champ">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-5 pb-9 sm:pt-12 sm:pb-14 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:pb-20">
            <div className="grid gap-5 sm:gap-7">
              <div className="grid gap-3 sm:gap-4">
                <h1 className="max-w-[18ch] font-titre text-[2.1rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance sm:text-6xl sm:leading-[1.02] sm:tracking-[-0.035em] lg:text-[4rem]">
                  Ce qui dort au grenier cherche preneur à deux rues d&apos;ici.
                </h1>
                <p className="max-w-xl text-sur-champ-doux sm:text-lg">
                  Achetez et vendez entre particuliers, en main propre ou par colis, partout en France.
                </p>
              </div>

              <form
                action="/annonces"
                role="search"
                className="verre grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 rounded-[18px] p-1.5 text-prune-nuit sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
              >
                <div className="flex h-13 min-w-0 items-center gap-3 rounded-champ bg-surface px-4">
                  <IconeLoupe className="size-5 shrink-0 text-mauve" />
                  <label htmlFor="recherche-accueil" className="sr-only">
                    Que recherchez-vous ?
                  </label>
                  <input
                    id="recherche-accueil"
                    name="q"
                    type="search"
                    placeholder="Que recherchez-vous ?"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-mauve"
                  />
                </div>
                {/* Sur téléphone, le lieu se choisit dans les filtres de la recherche */}
                <div className="hidden h-13 min-w-0 items-center gap-3 rounded-champ bg-surface px-4 sm:flex">
                  <IconeLieu className="size-5 shrink-0 text-mauve" />
                  <label htmlFor="lieu-accueil" className="sr-only">
                    Ville, département ou code postal
                  </label>
                  <input
                    id="lieu-accueil"
                    name="lieu"
                    placeholder="Ville ou code postal"
                    autoComplete="address-level2"
                    className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-mauve"
                  />
                </div>
                <button type="submit" className="bouton h-13 px-4 text-base sm:px-6">
                  <span className="sr-only sm:not-sr-only">Rechercher</span>
                  <IconeLoupe className="size-5 sm:hidden" />
                </button>
              </form>

              {categories.length > 0 && (
                <nav
                  aria-label="Catégories"
                  className="-mx-4 flex gap-x-5 overflow-x-auto px-4 pb-1 text-[15px] whitespace-nowrap [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:items-baseline sm:gap-y-2 sm:overflow-visible sm:px-0 sm:pb-0"
                >
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/annonces?categorie=${c.slug}`}
                      className="font-semibold text-sur-champ underline decoration-white/30 underline-offset-[6px] transition-colors duration-150 hover:decoration-current"
                    >
                      {c.libelle}
                    </Link>
                  ))}
                </nav>
              )}

              {compte === "supprime" && (
                <p role="status" className="rounded-champ bg-white/10 px-4 py-3 text-sm">
                  Votre compte et toutes ses données ont été supprimés.
                </p>
              )}
            </div>

            {vitrine.length === 3 && (
              <div className="relative hidden aspect-square lg:block" aria-hidden="true">
                {vitrine.map((a, i) => (
                  <Link
                    key={a.id}
                    href={`/annonces/${a.id}`}
                    tabIndex={-1}
                    className={`group absolute ${pile[i]} rounded-[10px] bg-papier p-2 pb-3 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-verre hover:z-10 hover:-translate-y-1`}
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-creux">
                      <Image src={a.photo!} alt="" fill sizes="280px" className="object-cover" />
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-3 px-1">
                      <span className="truncate text-[13px] font-semibold text-encre-papier">{a.titre}</span>
                      <span className="etiquette shrink-0 text-sm">{formaterPrix(a.prixCentimes)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-16 px-4 pt-9 pb-16 sm:gap-24 sm:pt-14 sm:pb-24">
          <section aria-labelledby="titre-recentes" className="grid gap-5 sm:gap-7">
            <TitreSection id="titre-recentes" titre="Arrivé ces derniers jours" lien={{ href: "/annonces", libelle: "Toutes les annonces" }} />
            {annonces.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                {annonces.map((a) => (
                  <CarteAnnonce key={a.id} annonce={a} />
                ))}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3 border-y border-ligne py-10">
                <p className="font-titre text-xl font-semibold text-prune-nuit">Aucune annonce pour l&apos;instant.</p>
                <p className="text-mauve">Les premières annonces apparaîtront ici dès leur publication.</p>
                <Link href="/deposer" className="bouton mt-2">
                  Déposer la première annonce
                </Link>
              </div>
            )}
          </section>

          {/* Le ticket : les frais montrés sur un exemple chiffré plutôt qu'annoncés */}
          <section aria-labelledby="titre-ticket" className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-20">
            <div className="grid gap-8">
              <div className="grid gap-3">
                <h2 id="titre-ticket" className="max-w-[18ch] font-titre text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                  Ce que chacun paie, au centime près.
                </h2>
                <p className="max-w-[56ch] text-lg text-mauve">
                  Déposer une annonce ne coûte rien. Quand l&apos;acheteur paie en ligne, il règle {taux} % de frais de
                  service, et c&apos;est tout ce que garde Troqly.
                </p>
              </div>
              <ol className="grid gap-5 border-t border-ligne pt-6">
                {etapes.map((e, i) => (
                  <li key={e.titre} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
                    <span className="font-titre text-lg font-semibold text-abricot tabular-nums" aria-hidden="true">
                      {i + 1}.
                    </span>
                    <p className="max-w-[60ch] text-prune-nuit">
                      <strong className="font-semibold">{e.titre}</strong> <span className="text-mauve">{e.texte}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="-rotate-1 drop-shadow-[0_18px_22px_rgba(31,20,33,0.22)]">
            <figure className="ticket bg-papier px-6 pt-6 pb-9 text-encre-papier">
              <figcaption className="text-sm font-semibold tracking-wide uppercase opacity-70">
                Exemple : un objet à {formaterPrix(exemple.prixCentimes)}
              </figcaption>
              <dl className="mt-5 grid gap-3 font-titre text-[15px] tabular-nums">
                <div className="flex justify-between gap-4">
                  <dt>Prix de l&apos;objet</dt>
                  <dd>{formaterPrix(exemple.prixCentimes).replace(/ €|\s€/, ",00 €")}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Frais de service ({taux} %)</dt>
                  <dd>{auCentime(exemple.fraisServiceCentimes)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-dashed border-current/30 pt-3 text-lg font-semibold">
                  <dt>L&apos;acheteur paie</dt>
                  <dd>{auCentime(exemple.totalCentimes)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed opacity-80">
                Le vendeur reçoit {formaterPrix(exemple.prixCentimes)} moins les frais de carte bancaire. Le montant exact
                lui est affiché dans sa vente. Pour un envoi en colis, la livraison s&apos;ajoute au prix payé par
                l&apos;acheteur.
              </p>
            </figure>
            </div>
          </section>

          <section aria-labelledby="titre-faq" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-20">
            <h2 id="titre-faq" className="font-titre text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
            <div className="border-t border-ligne">
              {questions.map(({ q, r }) => (
                <details key={q} className="group border-b border-ligne">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] font-semibold text-prune-nuit [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-ligne text-prune transition-transform duration-200 ease-verre group-open:rotate-45">
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
