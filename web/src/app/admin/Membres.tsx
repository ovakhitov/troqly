import Link from "next/link";
import { emailsDesMembres } from "@/lib/admin";
import { formaterDateRelative } from "@/lib/annonces";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { boutonFort, champ, Filtres, ROLES, Vide } from "./ui";

const FILTRES = [
  ["tous", "Tous"],
  ["vendeurs", "Vendeurs payables"],
  ["bloques", "Bloqués"],
  ["equipe", "Équipe"],
] as const;

type Membre = {
  id: string;
  pseudo: string;
  ville: string | null;
  role: string;
  bloque: boolean;
  cree_le: string;
  boutique_nom: string | null;
};

export async function Membres({ filtre, recherche }: { filtre?: string; recherche?: string }) {
  const actif = FILTRES.some(([f]) => f === filtre) ? filtre! : "tous";
  const q = recherche?.trim().slice(0, 80) ?? "";
  const admin = creerClientAdmin();
  const [comptes, { data: paiements }] = await Promise.all([
    emailsDesMembres(),
    admin.from("comptes_paiement").select("membre, versements_actifs"),
  ]);
  const payables = new Set((paiements ?? []).filter((p) => p.versements_actifs).map((p) => p.membre as string));

  let requete = admin
    .from("profils")
    .select("id, pseudo, ville, role, bloque, cree_le, boutique_nom")
    .order("cree_le", { ascending: false })
    .limit(100);
  if (actif === "bloques") requete = requete.eq("bloque", true);
  if (actif === "vendeurs") requete = requete.in("id", payables.size ? [...payables] : ["00000000-0000-0000-0000-000000000000"]);
  if (actif === "equipe") requete = requete.in("role", ["moderateur", "administrateur"]);
  if (q) {
    // Recherche dans le pseudo, le nom de boutique ou l'adresse e-mail
    const motif = q.replace(/[%_,()]/g, " ");
    const parEmail = [...comptes.values()].filter((u) => u.email?.toLowerCase().includes(q.toLowerCase())).map((u) => u.id);
    requete = requete.or(
      [`pseudo.ilike.%${motif}%`, `boutique_nom.ilike.%${motif}%`, ...(parEmail.length ? [`id.in.(${parEmail.slice(0, 50).join(",")})`] : [])].join(","),
    );
  }

  const [{ data }, { data: annonces }] = await Promise.all([requete, admin.from("annonces").select("vendeur").neq("statut", "vendue")]);
  const nbAnnonces = new Map<string, number>();
  for (const a of annonces ?? []) nbAnnonces.set(a.vendeur, (nbAnnonces.get(a.vendeur) ?? 0) + 1);

  const membres = (data ?? []) as Membre[];

  return (
    <div className="grid gap-4">
      <form action="/admin" className="flex gap-2">
        <input type="hidden" name="section" value="membres" />
        <input type="hidden" name="filtre" value={actif} />
        <label htmlFor="q" className="sr-only">Rechercher un pseudo, une boutique ou un e-mail</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Pseudo, boutique ou e-mail" className={`${champ} flex-1 py-2.5 text-sm`} />
        <button type="submit" className={boutonFort}>Rechercher</button>
      </form>

      <Filtres options={FILTRES} actif={actif} base={`/admin?section=membres${q ? `&q=${encodeURIComponent(q)}` : ""}`} />

      {!membres.length ? (
        <Vide texte="Aucun compte trouvé." />
      ) : (
        <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
          {membres.map((m) => {
            const compte = comptes.get(m.id);
            const n = nbAnnonces.get(m.id) ?? 0;
            return (
              <li key={m.id} className="border-b border-ligne last:border-b-0">
                <Link href={`/admin/membres/${m.id}`} className="grid gap-1 p-4 hover:bg-creux sm:grid-cols-[1fr_auto] sm:items-center">
                  <span className="grid gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-titre font-semibold text-prune-nuit">
                      {m.pseudo}
                      {m.role !== "utilisateur" && (
                        <span className="rounded-full border border-prune px-2 py-0.5 text-xs text-prune">{ROLES[m.role]}</span>
                      )}
                      {m.bloque && <span className="rounded-full border border-abricot px-2 py-0.5 text-xs text-abricot">Bloqué</span>}
                    </span>
                    <span className="text-xs break-all text-mauve">
                      {compte?.email ?? "e-mail inconnu"}
                      {compte && !compte.email_confirmed_at && " (non confirmé)"}
                    </span>
                  </span>
                  <span className="text-xs text-mauve sm:text-right">
                    {m.boutique_nom ? `Boutique « ${m.boutique_nom} »` : "Sans boutique"} · {n} annonce{n > 1 ? "s" : ""}
                    {payables.has(m.id) && " · paiements actifs"}
                    <br />
                    inscrit {formaterDateRelative(m.cree_le)}
                    {m.ville && ` · ${m.ville}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {membres.length === 100 && <p className="text-xs text-mauve">Seuls les 100 comptes les plus récents sont affichés : affinez la recherche.</p>}
    </div>
  );
}
