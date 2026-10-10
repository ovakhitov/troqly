import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import {
  IconeBouclier,
  IconeColis,
  IconeLoupe,
  IconeMains,
  IconePourcent,
} from "@/components/Icones";
import { TitreSection } from "@/components/TitreSection";
import { SELECTION_CARTE, versCarte } from "@/lib/annonces";
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

// Structure reprise de l'accueil Gency (gency/index.html) :
// carte d'accroche, compteurs, bandeau, cartes de services, grille, FAQ, pied de page.

const promesses = [
  { Icone: IconeBouclier, titre: "Paiement en ligne", texte: "Via un prestataire agréé, sans partager vos coordonnées bancaires." },
  { Icone: IconeMains, titre: "Main propre", texte: "Rencontrez-vous près de chez vous." },
  { Icone: IconeColis, titre: "Livraison", texte: "Expédiez en point relais ou à domicile." },
  { Icone: IconePourcent, titre: "Le vendeur touche le prix affiché", texte: "Les frais de service sont payés par l'acheteur." },
];

const etapes = [
  { titre: "Déposez votre annonce", texte: "Quelques photos, un prix, votre ville. L'annonce est en ligne aussitôt." },
  { titre: "Échangez avec l'acheteur", texte: "La messagerie Troqly garde vos coordonnées privées jusqu'à la vente." },
  { titre: "Remettez ou expédiez", texte: "En main propre ou par colis. Le paiement est versé sur votre compte bancaire." },
];

const questions = [
  {
    q: "Combien coûte une vente sur Troqly ?",
    r: "Déposer une annonce et vendre sont gratuits pour le vendeur, qui touche le prix affiché. L'acheteur qui paie en ligne règle des frais de service, indiqués avant le paiement.",
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

export default async function Accueil({ searchParams }: { searchParams: Promise<{ compte?: string }> }) {
  const [{ categories, annonces }, { compte }] = await Promise.all([chargerAccueil(), searchParams]);
  return (
    <div className="halo min-h-screen">
      <EnTete />

      <main className="mx-auto grid max-w-6xl gap-16 px-4 pt-8 pb-20">
        {compte === "supprime" && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            Votre compte et toutes ses données ont été supprimés.
          </p>
        )}
        {/* Carte d'accroche (héros de Gency) */}
        <section className="grid gap-6 rounded-[32px] border border-ligne bg-surface p-6 sm:p-10">
          <div className="grid max-w-2xl gap-4">
            <h1 className="font-titre text-4xl leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-5xl">
              Achetez et vendez près de chez vous, en toute confiance
            </h1>
            <p className="text-lg text-mauve">
              Des objets de seconde main entre particuliers, en main propre ou livrés partout en France.
            </p>
          </div>

          <form action="/annonces" role="search" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="recherche-accueil" className="sr-only">
              Que recherchez-vous ?
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-ligne bg-ivoire px-5 py-3.5 text-mauve">
              <IconeLoupe className="size-5 shrink-0" />
              <input
                id="recherche-accueil"
                name="q"
                type="search"
                placeholder="Que recherchez-vous ?"
                className="w-full min-w-0 bg-transparent text-prune-nuit outline-none placeholder:text-mauve"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-action px-7 py-3.5 font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
            >
              Rechercher
            </button>
          </form>

          <ul className="flex flex-wrap gap-2" aria-label="Catégories populaires">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/annonces?categorie=${c.slug}`}
                  className="inline-block rounded-full border border-ligne bg-ivoire px-4 py-1.5 text-sm font-medium text-prune-nuit transition-colors duration-200 hover:border-prune"
                >
                  {c.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Rangée de compteurs de Gency, transformée en promesses */}
        <section aria-label="Pourquoi Troqly" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {promesses.map(({ Icone, titre, texte }) => (
            <div key={titre} className="grid content-start gap-2 rounded-carte border border-ligne bg-surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-ivoire text-prune">
                <Icone className="size-5" />
              </span>
              <h2 className="font-titre text-base font-semibold text-prune-nuit">{titre}</h2>
              <p className="text-sm text-mauve">{texte}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6">
          <TitreSection titre="Annonces récentes" lien={{ href: "/annonces", libelle: "Voir toutes les annonces" }} />
          {annonces.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {annonces.map((a) => (
                <CarteAnnonce key={a.id} annonce={a} />
              ))}
            </div>
          ) : (
            <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
              <p className="font-titre text-lg font-semibold text-prune-nuit">Aucune annonce pour l&apos;instant.</p>
              <p className="text-mauve">Les premières annonces apparaîtront ici dès leur publication.</p>
              <Link href="/deposer" className="font-semibold text-prune hover:underline">
                Déposer la première annonce
              </Link>
            </div>
          )}
        </section>

        <section className="grid gap-6">
          <TitreSection titre="Comment ça marche" />
          <ol className="grid gap-3 md:grid-cols-3">
            {etapes.map((e, i) => (
              <li key={e.titre} className="grid content-start gap-2 rounded-carte border border-ligne bg-surface p-6">
                <span className="grid size-9 place-items-center rounded-full border border-ligne font-titre font-semibold text-prune">
                  {i + 1}
                </span>
                <h3 className="font-titre text-lg font-semibold text-prune-nuit">{e.titre}</h3>
                <p className="text-sm text-mauve">{e.texte}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6">
          <TitreSection titre="Questions fréquentes" />
          <div className="grid gap-2">
            {questions.map(({ q, r }) => (
              <details key={q} className="group rounded-champ border border-ligne bg-surface px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-titre font-semibold text-prune-nuit">
                  {q}
                  <span className="text-xl text-prune transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pt-3 text-mauve">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-ligne">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-mauve">
          <span>© {new Date().getFullYear()} Troqly</span>
          <nav className="flex flex-wrap gap-5" aria-label="Informations">
            <Link href="/aide" className="hover:text-prune-nuit">Aide</Link>
            <Link href="/cgu" className="hover:text-prune-nuit">Conditions d&apos;utilisation</Link>
            <Link href="/confidentialite" className="hover:text-prune-nuit">Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
