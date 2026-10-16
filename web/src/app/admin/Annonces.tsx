import Link from "next/link";
import { estBoostee, formaterDateRelative, formaterPrix, libellesStatut, type StatutAnnonce } from "@/lib/annonces";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { boosterAnnonce, masquerAnnonce, supprimerAnnonce } from "./actions";
import { bouton, boutonDanger, boutonFort, CarteChiffre, champ, Confirmer, dateCourte, Filtres, Gerer, RangeeChiffres, Retour, Vide } from "./ui";

const FILTRES = [
  ["toutes", "Toutes"],
  ["en_ligne", "En ligne"],
  ["boostees", "À la une"],
  ["masquees", "Masquées"],
  ["vendues", "Vendues"],
] as const;

type Annonce = {
  id: string;
  titre: string;
  prix_centimes: number;
  statut: StatutAnnonce;
  moderation: "visible" | "masquee";
  ville: string;
  categorie: string;
  boost_jusqua: string | null;
  cree_le: string;
  vendeur: string;
  profils: { pseudo: string } | null;
};

export async function Annonces({ filtre, recherche }: { filtre?: string; recherche?: string }) {
  const actif = FILTRES.some(([f]) => f === filtre) ? filtre! : "toutes";
  const q = recherche?.trim().slice(0, 80) ?? "";

  let requete = creerClientAdmin()
    .from("annonces")
    .select("id, titre, prix_centimes, statut, moderation, ville, categorie, boost_jusqua, cree_le, vendeur, profils!annonces_vendeur_fkey(pseudo)")
    .order("cree_le", { ascending: false })
    .limit(100);
  if (actif === "en_ligne") requete = requete.eq("moderation", "visible").neq("statut", "vendue");
  if (actif === "boostees") requete = requete.gt("boost_jusqua", new Date().toISOString());
  if (actif === "masquees") requete = requete.eq("moderation", "masquee");
  if (actif === "vendues") requete = requete.eq("statut", "vendue");
  if (q) requete = requete.ilike("titre", `%${q.replace(/[%_]/g, " ")}%`);

  const admin = creerClientAdmin();
  const compter = (r: PromiseLike<{ count: number | null }>) => r.then((x) => x.count ?? 0);
  const [{ data }, enLigne, boosteesActives, masquees, vendues] = await Promise.all([
    requete,
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("moderation", "visible").neq("statut", "vendue")),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).gt("boost_jusqua", new Date().toISOString())),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("moderation", "masquee")),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("statut", "vendue")),
  ]);
  const annonces = (data ?? []) as unknown as Annonce[];
  const retour = `/admin/annonces?filtre=${actif}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="grid gap-4">
      <RangeeChiffres>
        <CarteChiffre libelle="En ligne" valeur={String(enLigne)} detail="visibles sur le site" teinte="statut" href="/admin/annonces?filtre=en_ligne" />
        <CarteChiffre libelle="À la une" valeur={String(boosteesActives)} detail="en tête des résultats" teinte="abricot" href="/admin/annonces?filtre=boostees" />
        <CarteChiffre libelle="Masquées" valeur={String(masquees)} detail="par la modération" teinte="alerte" href="/admin/annonces?filtre=masquees" />
        <CarteChiffre libelle="Vendues" valeur={String(vendues)} detail="depuis l'ouverture" teinte="info" href="/admin/annonces?filtre=vendues" />
      </RangeeChiffres>
      <form action="/admin/annonces" className="flex gap-2">
        <input type="hidden" name="filtre" value={actif} />
        <label htmlFor="q" className="sr-only">Rechercher dans les titres</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Rechercher dans les titres" className={`${champ} flex-1 py-2.5 text-sm`} />
        <button type="submit" className={boutonFort}>Rechercher</button>
      </form>

      <Filtres options={FILTRES} actif={actif} base={`/admin/annonces${q ? `?q=${encodeURIComponent(q)}` : ""}`} />

      {!annonces.length ? (
        <Vide texte="Aucune annonce ici." />
      ) : (
        <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
          {annonces.map((a) => {
            const boostee = estBoostee(a.boost_jusqua);
            return (
              <li key={a.id} className="grid gap-2 border-b border-ligne p-4 last:border-b-0 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-0.5">
                  <Link href={`/annonces/${a.id}`} className="font-titre font-semibold text-prune hover:underline">
                    {a.titre}
                  </Link>
                  <span className="text-xs text-mauve">
                    <Link href={`/admin/membres/${a.vendeur}`} className="text-prune hover:underline">
                      {a.profils?.pseudo ?? "Membre"}
                    </Link>{" "}
                    · {a.ville} · déposée {formaterDateRelative(a.cree_le)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <span className="font-titre font-semibold text-prune-nuit tabular-nums">{formaterPrix(a.prix_centimes)}</span>
                  <span className="rounded-full bg-mauve/12 px-2.5 py-0.5 text-xs font-semibold text-mauve">{libellesStatut[a.statut]}</span>
                  {a.moderation === "masquee" && (
                    <span className="rounded-full bg-alerte/12 px-2.5 py-0.5 text-xs font-semibold text-alerte">Masquée</span>
                  )}
                  {boostee && <span className="rounded-full bg-prune/12 px-2.5 py-0.5 text-xs font-semibold text-prune">À la une</span>}
                </div>

                <Gerer>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={boosterAnnonce.bind(null, a.id)} className="flex flex-wrap items-center gap-2">
                      <Retour vers={retour} />
                      <label htmlFor={`boost-${a.id}`} className="text-xs text-prune-nuit">
                        {boostee ? `À la une jusqu'au ${dateCourte.format(new Date(a.boost_jusqua!))}` : "Mettre à la une"}
                      </label>
                      <select id={`boost-${a.id}`} name="jours" defaultValue="7" className={champ}>
                        <option value="3">3 jours</option>
                        <option value="7">7 jours</option>
                        <option value="14">14 jours</option>
                        <option value="30">30 jours</option>
                        {boostee && <option value="0">Arrêter la mise à la une</option>}
                      </select>
                      <button type="submit" className={bouton}>Appliquer</button>
                    </form>

                    <form action={masquerAnnonce.bind(null, a.id, a.moderation === "visible")} className="flex flex-wrap gap-2">
                      <Retour vers={retour} />
                      {a.moderation === "visible" && (
                        <>
                          <label className="sr-only" htmlFor={`masq-${a.id}`}>Motif du masquage</label>
                          <input id={`masq-${a.id}`} name="motif" placeholder="Motif (journal)" className={`${champ} w-40`} />
                        </>
                      )}
                      <button type="submit" className={bouton}>{a.moderation === "visible" ? "Masquer" : "Réafficher"}</button>
                    </form>
                  </div>

                  <form action={supprimerAnnonce.bind(null, a.id)} className="grid gap-2 rounded-champ border border-ligne p-3 sm:max-w-md">
                    <Retour vers={retour} />
                    <label className="sr-only" htmlFor={`suppr-${a.id}`}>Motif de la suppression</label>
                    <input id={`suppr-${a.id}`} name="motif" required placeholder="Motif de la suppression (obligatoire)" className={champ} />
                    <Confirmer>Je supprime définitivement cette annonce.</Confirmer>
                    <button type="submit" className={`${boutonDanger} justify-self-start`}>Supprimer l&apos;annonce</button>
                  </form>
                </Gerer>
              </li>
            );
          })}
        </ul>
      )}
      {annonces.length === 100 && <p className="text-xs text-mauve">Seules les 100 annonces les plus récentes sont affichées.</p>}
    </div>
  );
}
