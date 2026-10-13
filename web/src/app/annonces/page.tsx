import type { Metadata } from "next";
import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { prixEnCentimes, SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Filtres> }): Promise<Metadata> {
  const f = await searchParams;
  const q = f.q?.trim();
  return {
    title: q ? `« ${q} » : annonces` : "Toutes les annonces",
    description: "Objets d'occasion vendus par des particuliers près de chez vous : main propre ou livraison, paiement sécurisé.",
    alternates: { canonical: f.categorie ? `/annonces?categorie=${encodeURIComponent(f.categorie)}` : "/annonces" },
    // Les pages de recherche libre ne sont pas indexées : elles dupliquent les annonces
    robots: q ? { index: false, follow: true } : undefined,
  };
}

const PAR_PAGE = 24;

type Filtres = {
  q?: string;
  categorie?: string;
  prixMin?: string;
  prixMax?: string;
  lieu?: string;
  remise?: string;
  tri?: string;
  page?: string;
};

function echapperMotif(v: string) {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export default async function PageAnnonces({ searchParams }: { searchParams: Promise<Filtres> }) {
  const f = await searchParams;
  const page = Math.max(1, Number.parseInt(f.page ?? "1", 10) || 1);
  const supabase = await creerClientServeur();

  let requete = supabase
    .from("annonces")
    .select(SELECTION_CARTE, { count: "exact" })
    .eq("moderation", "visible")
    .neq("statut", "vendue");

  const q = f.q?.trim();
  if (q) requete = requete.textSearch("recherche", q, { config: "french", type: "websearch" });
  if (f.categorie) requete = requete.eq("categorie", f.categorie);

  let min = f.prixMin ? prixEnCentimes(f.prixMin) : null;
  let max = f.prixMax ? prixEnCentimes(f.prixMax) : null;
  // Minimum et maximum inversés : on les remet dans l'ordre
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  if (min !== null) requete = requete.gte("prix_centimes", min);
  if (max !== null) requete = requete.lte("prix_centimes", max);

  const lieu = f.lieu?.trim();
  if (lieu) {
    if (/^\d{5}$/.test(lieu)) requete = requete.eq("code_postal", lieu);
    else if (/^\d{2}$/.test(lieu)) requete = requete.like("code_postal", `${lieu}%`);
    else requete = requete.ilike("ville", `%${echapperMotif(lieu)}%`);
  }

  if (f.remise === "main-propre") requete = requete.eq("main_propre", true);
  if (f.remise === "livraison") requete = requete.eq("livraison", true);

  if (f.tri === "prix-croissant") requete = requete.order("prix_centimes", { ascending: true });
  else if (f.tri === "prix-decroissant") requete = requete.order("prix_centimes", { ascending: false });
  else requete = requete.order("cree_le", { ascending: false });

  const debut = (page - 1) * PAR_PAGE;
  const [{ data, count, error }, { data: categories }] = await Promise.all([
    requete.range(debut, debut + PAR_PAGE - 1),
    supabase.from("categories").select("slug, libelle").order("ordre"),
  ]);

  const annonces = (data ?? []).map(versCarte);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lienPage = (n: number) => {
    const p = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    p.set("page", String(n));
    return `/annonces?${p}`;
  };

  const champ =
    "h-11 w-full min-w-0 rounded-champ border border-ligne bg-surface px-3 text-[15px] text-prune-nuit outline-none transition-colors duration-150 focus:border-prune";
  const etiquetteChamp = "text-[13px] font-semibold text-mauve";
  const nbFiltres = [f.categorie, lieu, f.prixMin, f.prixMax, f.remise].filter(Boolean).length;

  const filtres = (suffixe: string) => (
    <form action="/annonces" className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={`q${suffixe}`} className={etiquetteChamp}>Recherche</label>
        <input id={`q${suffixe}`} name="q" type="search" defaultValue={q} placeholder="Vélo, canapé, appareil photo…" className={champ} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`categorie${suffixe}`} className={etiquetteChamp}>Catégorie</label>
        <select id={`categorie${suffixe}`} name="categorie" defaultValue={f.categorie ?? ""} className={champ}>
          <option value="">Toutes</option>
          {(categories ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>{c.libelle}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`lieu${suffixe}`} className={etiquetteChamp}>Ville, département ou code postal</label>
        <input id={`lieu${suffixe}`} name="lieu" defaultValue={lieu} placeholder="Lyon, 69 ou 69007" className={champ} />
      </div>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className={`${etiquetteChamp} mb-1.5`}>Prix (€)</legend>
        <div className="grid gap-1">
          <label htmlFor={`prixMin${suffixe}`} className="sr-only">Prix minimum en euros</label>
          <input id={`prixMin${suffixe}`} name="prixMin" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Min" defaultValue={f.prixMin} className={champ} />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`prixMax${suffixe}`} className="sr-only">Prix maximum en euros</label>
          <input id={`prixMax${suffixe}`} name="prixMax" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Max" defaultValue={f.prixMax} className={champ} />
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <label htmlFor={`remise${suffixe}`} className={etiquetteChamp}>Remise</label>
        <select id={`remise${suffixe}`} name="remise" defaultValue={f.remise ?? ""} className={champ}>
          <option value="">Main propre ou livraison</option>
          <option value="main-propre">Main propre</option>
          <option value="livraison">Livraison</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`tri${suffixe}`} className={etiquetteChamp}>Trier par</label>
        <select id={`tri${suffixe}`} name="tri" defaultValue={f.tri ?? ""} className={champ}>
          <option value="">Plus récentes</option>
          <option value="prix-croissant">Prix croissant</option>
          <option value="prix-decroissant">Prix décroissant</option>
        </select>
      </div>
      <div className="flex items-center gap-4 pt-1">
        <button type="submit" className="bouton flex-1">Filtrer</button>
        <Link href="/annonces" className="text-sm font-semibold text-prune hover:underline">Effacer</Link>
      </div>
    </form>
  );

  return (
    <>
      <EnTete />
      <main id="contenu" className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-24 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <div className="grid gap-1 lg:col-span-2">
          <h1 className="font-titre text-[2rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-[2.5rem]">
            {q ? `Résultats pour « ${q} »` : "Toutes les annonces"}
          </h1>
          {!error && total > 0 && (
            <p className="text-mauve">
              {total} annonce{total > 1 ? "s" : ""}
              {lieu ? ` · ${lieu}` : ""}
            </p>
          )}
        </div>

        {/* Filtres : colonne fixe sur grand écran, volet repliable sur mobile */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">{filtres("")}</div>
        </aside>
        <details className="group rounded-carte border border-ligne bg-surface lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-prune-nuit [&::-webkit-details-marker]:hidden">
            <span>
              Filtres et tri
              {nbFiltres > 0 && <span className="ml-2 rounded-full bg-action px-2 py-0.5 text-xs text-sur-action">{nbFiltres}</span>}
            </span>
            <span className="text-sm text-prune group-open:hidden">Afficher</span>
            <span className="hidden text-sm text-prune group-open:inline">Masquer</span>
          </summary>
          <div className="border-t border-ligne p-4">{filtres("-mobile")}</div>
        </details>

        <div className="grid content-start gap-8">
        {error ? (
          <p role="alert" className="text-prune-nuit">La recherche n&apos;a pas abouti. Réessayez dans un instant.</p>
        ) : annonces.length === 0 && page > 1 ? (
          <div className="grid justify-items-start gap-3 border-y border-ligne py-10">
            <p className="font-titre text-xl font-semibold text-prune-nuit">Cette page n&apos;existe plus.</p>
            <Link href={lienPage(1)} className="font-semibold text-prune hover:underline">Revenir à la première page</Link>
          </div>
        ) : annonces.length === 0 ? (
          <div className="grid justify-items-start gap-3 border-y border-ligne py-10">
            <p className="font-titre text-xl font-semibold text-prune-nuit">Aucune annonce ne correspond.</p>
            <p className="text-mauve">Élargissez la recherche, ou soyez la première personne à proposer cet objet.</p>
            <Link href="/deposer" className="bouton mt-2">Déposer une annonce</Link>
          </div>
        ) : (
          <>
            <h2 className="sr-only">Résultats</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {annonces.map((a, i) => (
                <CarteAnnonce key={a.id} annonce={a} prioritaire={i < 4} />
              ))}
            </div>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-3 text-sm font-semibold" aria-label="Pages">
                {page > 1 && <Link href={lienPage(page - 1)} rel="prev" className="bouton-contour">Précédente</Link>}
                <span className="px-2 text-mauve tabular-nums">Page {page} sur {pages}</span>
                {page < pages && <Link href={lienPage(page + 1)} rel="next" className="bouton-contour">Suivante</Link>}
              </nav>
            )}
          </>
        )}
        </div>
      </main>
      <PiedDePage />
    </>
  );
}
