import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { ChampAnneau } from "@/components/accueil/ChampAnneau";
import { Defilement } from "@/components/accueil/Defilement";
import { Vitrine } from "@/components/accueil/Vitrine";
import { Manifeste } from "@/components/immersif/Manifeste";
import { Objections } from "@/components/immersif/Objections";
import { Processus } from "@/components/immersif/Processus";
import { IconeChevron, IconeFleche, IconeLieu, IconeLoupe, IconePlus } from "@/components/Icones";
import { PiedDePage } from "@/components/PiedDePage";
import { TitreSection } from "@/components/TitreSection";
import { formaterPrix, SELECTION_CARTE, versCarte, type LigneCarte } from "@/lib/annonces";
import { calculerFrais, COMMISSION_BPS } from "@/lib/frais";
import { DESCRIPTION_SITE, NOM_SITE, URL_SITE } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";

async function chargerAccueil() {
  if (!supabaseEnv()) return { categories: [], annonces: [], boostees: [], rayons: [] };
  const supabase = await creerClientServeur();
  const visibles = (selection: string = SELECTION_CARTE) =>
    supabase.from("annonces").select(selection).eq("moderation", "visible").neq("statut", "vendue");
  const [{ data: categories }, { data: recentes }, { data: boostees }, { data: parCategorie }] = await Promise.all([
    supabase.from("categories").select("slug, libelle").order("ordre"),
    visibles().order("cree_le", { ascending: false }).limit(12),
    visibles().gt("boost_jusqua", new Date().toISOString()).order("boost_jusqua", { ascending: false }).limit(4),
    visibles(`${SELECTION_CARTE}, categorie`).order("cree_le", { ascending: false }).limit(80),
  ]);
  // Une annonce boostée n'apparaît qu'une fois dans les grilles de l'accueil
  const enAvant = ((boostees ?? []) as unknown as LigneCarte[]).map(versCarte);
  const dejaAffichees = new Set(enAvant.map((a) => a.id));

  // Rayons : pour chaque catégorie, ses quatre dernières annonces avec photo
  const lignes = (parCategorie ?? []) as unknown as (LigneCarte & { categorie: string })[];
  const rayons = (categories ?? [])
    .map((c) => ({
      ...c,
      annonces: lignes
        .filter((l) => l.categorie === c.slug)
        .map(versCarte)
        .filter((a) => a.photo)
        .slice(0, 4),
    }))
    .filter((r) => r.annonces.length > 0);

  return {
    categories: (categories ?? []).map((c) => ({ ...c, photo: rayons.find((r) => r.slug === c.slug)?.annonces[0]?.photo ?? null })),
    annonces: ((recentes ?? []) as unknown as LigneCarte[]).map(versCarte).filter((a) => !dejaAffichees.has(a.id)).slice(0, 8),
    boostees: enAvant,
    rayons,
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

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ categories, annonces, boostees, rayons }, { compte }] = await Promise.all([chargerAccueil(), searchParams]);
  const vitrine = [...boostees, ...annonces]
    .filter((a) => a.photo)
    .slice(0, 5)
    .map((a) => ({ id: a.id, titre: a.titre, prix: formaterPrix(a.prixCentimes), ville: a.ville, photo: a.photo! }));
  // Photos des annonces du moment, pour la mosaïque des étapes et la traînée sous la souris
  const photos = [...new Set([...boostees, ...annonces, ...rayons.flatMap((r) => r.annonces)].flatMap((a) => (a.photo ? [a.photo] : [])))];
  const exemple = calculerFrais(10_000);
  const taux = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(COMMISSION_BPS / 100);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EnTete recherche={false} />

      <main id="contenu" className="overflow-x-clip">
        {/* Bandeau sombre en haut de la feuille, comme celui de la référence Shop */}
        <Link
          href="/deposer"
          className="group flex h-10 items-center justify-center gap-2 bg-champ px-4 text-[13px] text-sur-champ-doux transition-colors duration-200 hover:text-sur-champ"
        >
          <span className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-medium text-sur-champ">Gratuit</span>
          <span className="truncate">
            <span className="font-medium text-sur-champ">Déposez une annonce en deux minutes.</span>
            <span className="hidden sm:inline"> Elle est en ligne aussitôt, partout en France.</span>
          </span>
          <IconeFleche className="fleche size-3.5 shrink-0 rotate-45 transition-transform duration-300 ease-verre group-hover:translate-x-0.5" />
        </Link>

        {/* Vitrine : des objets du moment flottent en perspective au-dessus du grand lettrage, puis la recherche */}
        <section className="relative mx-auto max-w-[75rem] overflow-x-clip px-4 pt-4 pb-14 sm:px-6 sm:pt-8 sm:pb-20">
          {vitrine.length > 0 && <Vitrine objets={vitrine} />}

          <div className={`relative mx-auto grid max-w-[46rem] justify-items-center gap-5 text-center sm:gap-6 ${vitrine.length ? "-mt-[4%] sm:-mt-[5%]" : "pt-10"}`}>
            <h1 className="arrivee grid justify-items-center" style={{ "--arrivee-delai": "80ms" } as CSSProperties}>
              <span aria-hidden="true" className="lettrage text-[clamp(5rem,17vw,10.5rem)] leading-[0.82] font-semibold tracking-[-0.075em]">
                troqly
              </span>
              <span className="sr-only">Troqly, petites annonces entre particuliers près de chez vous</span>
            </h1>
            <p className="arrivee max-w-xl text-[17px] text-mauve" style={{ "--arrivee-delai": "180ms" } as CSSProperties}>
              Ce qui dort au grenier cherche preneur à deux rues d&apos;ici.
            </p>

            <form
              action="/annonces"
              role="search"
              className="arrivee grid h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center rounded-full border border-prune-nuit/10 bg-surface pr-1.5 pl-5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18),0_2px_6px_-2px_rgba(0,0,0,0.06)] transition-shadow duration-300 ease-verre focus-within:border-prune focus-within:shadow-[0_16px_50px_-14px_color-mix(in_oklab,var(--prune)_45%,transparent)] sm:h-16 sm:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)_auto] sm:pr-2 sm:pl-6"
              style={{ "--arrivee-delai": "260ms" } as CSSProperties}
            >
              <div className="flex min-w-0 items-center gap-3 self-stretch">
                <IconeLoupe className="size-5 shrink-0 text-mauve" />
                <label htmlFor="recherche-accueil" className="sr-only">
                  Que recherchez-vous ?
                </label>
                <input
                  id="recherche-accueil"
                  name="q"
                  type="search"
                  placeholder="Que recherchez-vous ?"
                  className="h-full w-full min-w-0 bg-transparent text-base text-prune-nuit outline-none placeholder:text-mauve"
                />
              </div>
              {/* Sur téléphone, le lieu se choisit dans les filtres de la recherche */}
              <span className="mx-4 hidden h-7 w-px bg-ligne sm:block" aria-hidden="true" />
              <div className="hidden min-w-0 items-center gap-3 self-stretch sm:flex">
                <IconeLieu className="size-5 shrink-0 text-mauve" />
                <label htmlFor="lieu-accueil" className="sr-only">
                  Ville, département ou code postal
                </label>
                <input
                  id="lieu-accueil"
                  name="lieu"
                  placeholder="Ville ou code postal"
                  autoComplete="address-level2"
                  className="h-full w-full min-w-0 bg-transparent text-base text-prune-nuit outline-none placeholder:text-mauve"
                />
              </div>
              <button
                type="submit"
                aria-label="Rechercher"
                className="group ml-2 grid size-11 place-items-center rounded-full bg-action text-sur-action shadow-action transition-[background-color,scale,box-shadow] duration-200 ease-verre hover:scale-105 hover:bg-action-survol hover:shadow-[0_6px_30px_color-mix(in_oklab,var(--prune)_50%,transparent)] active:scale-95 sm:size-12"
              >
                <IconeFleche className="size-5 rotate-45 transition-transform duration-300 ease-verre group-hover:translate-x-0.5" />
              </button>
            </form>

            {categories.length > 0 && (
              <nav
                aria-label="Catégories"
                className="arrivee -mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:max-w-[60rem] sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
                style={{ "--arrivee-delai": "340ms" } as CSSProperties}
              >
                {categories.map((c) => (
                  <Link key={c.slug} href={`/annonces?categorie=${c.slug}`} className="pilule min-h-10 gap-2 pr-4 pl-1.5 text-[15px]">
                    <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-creux text-[12px] font-semibold text-prune">
                      {c.photo ? <Image src={c.photo} alt="" fill sizes="28px" className="object-cover" /> : c.libelle.slice(0, 1)}
                    </span>
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

        <div className="mx-auto grid max-w-[75rem] grid-cols-[minmax(0,1fr)] gap-16 px-4 pb-16 sm:gap-20 sm:px-6 sm:pb-24">
          {/* Rayons : une mosaïque de quatre photos par catégorie, dans une rangée qui défile */}
          {rayons.length > 0 && (
            <section aria-labelledby="titre-rayons" className="revele grid grid-cols-[minmax(0,1fr)] gap-5">
              <h2 id="titre-rayons" className="sr-only">
                Parcourir par catégorie
              </h2>
              <Defilement libelle="Catégories en images">
                {rayons.map((r) => (
                  <div key={r.slug} className="grid w-[78%] shrink-0 snap-start gap-3 sm:w-[20.5rem]">
                    <Link
                      href={`/annonces?categorie=${r.slug}`}
                      className="group flex w-fit items-center gap-1.5 text-[1.25rem] font-semibold tracking-[-0.045em] text-prune-nuit"
                    >
                      {r.libelle}
                      <IconeChevron className="size-4 transition-transform duration-300 ease-verre group-hover:translate-x-1" />
                    </Link>
                    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-[22px] bg-surface shadow-carte">
                      {Array.from({ length: 4 }, (_, i) => r.annonces[i]).map((a, i) =>
                        a ? (
                          <Link key={a.id} href={`/annonces/${a.id}`} className="group relative aspect-square overflow-hidden bg-creux">
                            <Image
                              src={a.photo!}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 164px, 39vw"
                              className="object-cover transition-transform duration-700 ease-verre group-hover:scale-[1.06]"
                            />
                            <span className="verre-fort absolute right-2 bottom-2 left-2 truncate rounded-[12px] px-2.5 py-1.5 text-[12px] font-medium text-prune-nuit">
                              <span className="sr-only">{a.titre}, </span>
                              <span aria-hidden="true">{a.titre.split(" ").slice(0, 3).join(" ")}</span>
                              <span className="ml-1 font-semibold tabular-nums">· {formaterPrix(a.prixCentimes)}</span>
                            </span>
                          </Link>
                        ) : (
                          <span key={i} className="aspect-square bg-creux" />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </Defilement>
            </section>
          )}

          {boostees.length > 0 && (
            <section aria-labelledby="titre-boostees" className="revele grid gap-5 sm:gap-6">
              <TitreSection id="titre-boostees" titre="Annonces boostées" />
              <div className="grille-arrivee grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {boostees.map((a, i) => (
                  <CarteAnnonce key={a.id} annonce={a} prioritaire={i < 2} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="titre-recentes" className="revele grid gap-5 sm:gap-6">
            <TitreSection id="titre-recentes" titre="Arrivé ces derniers jours" lien={{ href: "/annonces", libelle: "Toutes les annonces" }} />
            {annonces.length ? (
              <div className="grille-arrivee grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
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

          {/* Scènes légères au défilement (skill site-immersif-skill) : l'idée, puis les trois étapes d'une vente */}
          <Manifeste />
          <Processus photos={photos.slice(0, 4)} />

          {/* Les frais montrés sur un exemple chiffré plutôt qu'annoncés */}
          <section
            aria-labelledby="titre-ticket"
            className="revele relative grid items-center gap-10 overflow-hidden rounded-[28px] bg-champ p-6 text-sur-champ sm:p-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16 lg:p-14"
          >
            <div className="grid gap-8">
              <div className="grid gap-3">
                <h2 id="titre-ticket" className="max-w-[18ch] text-[1.875rem] leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-[2.5rem]">
                  Ce que chacun paie, au centime près.
                </h2>
                <p className="max-w-[56ch] text-lg text-sur-champ-doux">
                  Déposer une annonce ne coûte rien. Quand l&apos;acheteur paie en ligne, il règle {taux} % de frais de
                  service, et c&apos;est tout ce que garde Troqly.
                </p>
              </div>
              <ol className="grid gap-4">
                {etapes.map((e, i) => (
                  <li key={e.titre} className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3">
                    <span
                      className="grid size-7 place-items-center rounded-full bg-white/10 text-sm font-semibold text-[#e6c2e8] tabular-nums ring-1 ring-white/15"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <p className="max-w-[60ch] text-sur-champ">
                      <span className="font-medium">{e.titre}</span> <span className="text-sur-champ-doux">{e.texte}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <figure className="relative -rotate-2 rounded-[24px] bg-papier p-6 text-encre-papier shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] transition-transform duration-700 ease-verre hover:rotate-0 lg:-mr-2">
              <figcaption className="text-sm font-medium text-[#6b6867]">
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
                <div className="flex justify-between gap-4 border-t border-dashed border-black/15 pt-3 text-lg font-semibold tracking-[-0.02em]">
                  <dt>L&apos;acheteur paie</dt>
                  <dd>{auCentime(exemple.totalCentimes)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-sm leading-relaxed text-[#6b6867]">
                Le vendeur reçoit {formaterPrix(exemple.prixCentimes)} moins les frais de carte bancaire. Le montant exact
                lui est affiché dans sa vente. Pour un envoi en colis, la livraison s&apos;ajoute au prix payé par
                l&apos;acheteur.
              </p>
            </figure>
          </section>

          <section aria-labelledby="titre-faq" className="revele grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
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

          <Objections photos={photos.slice(0, 12)} />

          {/* Dernier appel : un champ de capsules que l'anneau du pointeur allume (d'après Originkit Cursor Ring Field) */}
          <section
            aria-labelledby="titre-vendre"
            className="revele relative isolate grid min-h-[26rem] place-items-center overflow-hidden rounded-[28px] bg-champ px-6 py-16 text-center text-sur-champ sm:min-h-[30rem] sm:px-10 lg:min-h-[34rem]"
          >
            <ChampAnneau className="absolute inset-0 -z-10" />
            {/* Voile doux derrière le texte : les capsules restent vivantes autour, le texte reste lisible */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,color-mix(in_oklab,var(--champ)_90%,transparent)_0%,color-mix(in_oklab,var(--champ)_60%,transparent)_45%,transparent_78%)]"
            />
            <div className="grid max-w-[42rem] justify-items-center gap-5">
              <h2 id="titre-vendre" className="text-[2.5rem] leading-none font-semibold tracking-[-0.055em] text-balance sm:text-[3.75rem]">
                Un placard qui déborde ?
              </h2>
              <p className="max-w-[44ch] text-lg text-sur-champ-doux">
                Prenez-le en photo, fixez votre prix : l&apos;annonce est gratuite et en ligne aussitôt, pour les acheteurs de
                votre quartier comme de toute la France.
              </p>
              <Link href="/deposer" className="bouton-clair mt-3">
                Déposer une annonce
                <IconeFleche className="fleche size-4 rotate-45" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <PiedDePage />
    </>
  );
}
