import type { Metadata } from "next";
import Link from "next/link";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { prixEnCentimes, SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Annonces | Troqly" };

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
    "w-full min-w-0 rounded-champ border border-ligne bg-surface px-3 py-2.5 text-sm text-prune-nuit outline-none focus:border-prune";

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">
          {q ? `Résultats pour « ${q} »` : "Toutes les annonces"}
        </h1>

        <form action="/annonces" className="grid gap-3 rounded-carte border border-ligne bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-1 sm:col-span-2">
            <label htmlFor="q" className="text-xs font-semibold text-mauve">Recherche</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Vélo, canapé, appareil photo…" className={champ} />
          </div>
          <div className="grid gap-1">
            <label htmlFor="categorie" className="text-xs font-semibold text-mauve">Catégorie</label>
            <select id="categorie" name="categorie" defaultValue={f.categorie ?? ""} className={champ}>
              <option value="">Toutes</option>
              {(categories ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>{c.libelle}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="lieu" className="text-xs font-semibold text-mauve">Ville, département ou code postal</label>
            <input id="lieu" name="lieu" defaultValue={lieu} placeholder="Lyon, 69 ou 69007" className={champ} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <label htmlFor="prixMin" className="text-xs font-semibold text-mauve">Prix min (€)</label>
              <input id="prixMin" name="prixMin" type="number" min="0" step="0.01" defaultValue={f.prixMin} className={champ} />
            </div>
            <div className="grid gap-1">
              <label htmlFor="prixMax" className="text-xs font-semibold text-mauve">Prix max (€)</label>
              <input id="prixMax" name="prixMax" type="number" min="0" step="0.01" defaultValue={f.prixMax} className={champ} />
            </div>
          </div>
          <div className="grid gap-1">
            <label htmlFor="remise" className="text-xs font-semibold text-mauve">Remise</label>
            <select id="remise" name="remise" defaultValue={f.remise ?? ""} className={champ}>
              <option value="">Main propre ou livraison</option>
              <option value="main-propre">Main propre</option>
              <option value="livraison">Livraison</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="tri" className="text-xs font-semibold text-mauve">Trier par</label>
            <select id="tri" name="tri" defaultValue={f.tri ?? ""} className={champ}>
              <option value="">Plus récentes</option>
              <option value="prix-croissant">Prix croissant</option>
              <option value="prix-decroissant">Prix décroissant</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded-full bg-action px-6 py-2.5 text-sm font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
            >
              Filtrer
            </button>
            <Link href="/annonces" className="py-2.5 text-sm font-semibold text-prune hover:underline">
              Effacer
            </Link>
          </div>
        </form>

        {error ? (
          <p role="alert" className="text-prune-nuit">La recherche n&apos;a pas abouti. Réessayez dans un instant.</p>
        ) : annonces.length === 0 && page > 1 ? (
          <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
            <p className="font-titre text-lg font-semibold text-prune-nuit">Cette page n&apos;existe plus.</p>
            <Link href={lienPage(1)} className="font-semibold text-prune hover:underline">Revenir à la première page</Link>
          </div>
        ) : annonces.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
            <p className="font-titre text-lg font-semibold text-prune-nuit">Aucune annonce ne correspond.</p>
            <p className="text-mauve">Élargissez la recherche, ou soyez la première personne à proposer cet objet.</p>
            <Link href="/deposer" className="font-semibold text-prune hover:underline">Déposer une annonce</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-mauve">
              {total} annonce{total > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {annonces.map((a, i) => (
                <CarteAnnonce key={a.id} annonce={a} prioritaire={i < 4} />
              ))}
            </div>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4 text-sm font-semibold" aria-label="Pages">
                {page > 1 && <Link href={lienPage(page - 1)} className="text-prune hover:underline">Précédente</Link>}
                <span className="text-mauve">Page {page} sur {pages}</span>
                {page < pages && <Link href={lienPage(page + 1)} className="text-prune hover:underline">Suivante</Link>}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
