import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { formaterDateRelative } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";
import {
  bloquerCompte,
  changerRole,
  modererAnnonce,
  rejeterSignalement,
  supprimerAnnonceModeration,
} from "./actions";

export const metadata: Metadata = { title: "Modération | Troqly" };

const ONGLETS = [
  ["signalements", "Signalements"],
  ["masquees", "Annonces masquées"],
  ["membres", "Membres"],
  ["journal", "Journal"],
] as const;

const MOTIFS: Record<string, string> = {
  arnaque: "Arnaque",
  interdit: "Objet interdit",
  contenu_choquant: "Contenu choquant",
  doublon: "Doublon",
  mauvaise_categorie: "Mauvaise catégorie",
  autre: "Autre",
};

const ROLES: Record<string, string> = { utilisateur: "Membre", moderateur: "Modérateur", administrateur: "Administrateur" };

const bouton =
  "rounded-full border border-ligne px-3 py-1.5 text-xs font-semibold text-prune-nuit transition-colors duration-200 hover:border-prune";
const boutonFort = "rounded-full bg-action px-3 py-1.5 text-xs font-semibold text-sur-action";
const champMotif =
  "min-w-0 flex-1 rounded-full border border-ligne bg-surface px-3 py-1.5 text-xs text-prune-nuit outline-none focus:border-prune";

type Signalement = {
  id: number;
  motif: string;
  details: string | null;
  cree_le: string;
  annonces: { id: string; titre: string; moderation: string } | null;
  auteur_profil: { pseudo: string } | null;
};

export default async function PageModeration({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string; q?: string; erreur?: string }>;
}) {
  const { onglet: ongletDemande, q, erreur } = await searchParams;
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  if (!session?.claims) redirect("/connexion?suivant=/moderation");

  const { data: role } = await supabase.rpc("mon_role");
  if (role !== "moderateur" && role !== "administrateur") notFound();
  const estAdmin = role === "administrateur";

  const onglet = ONGLETS.some(([o]) => o === ongletDemande) ? ongletDemande! : "signalements";
  if (onglet === "journal" && !estAdmin) notFound();

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Modération</h1>

        <nav className="flex flex-wrap gap-2" aria-label="Sections">
          {ONGLETS.filter(([o]) => o !== "journal" || estAdmin).map(([o, libelle]) => (
            <Link
              key={o}
              href={`/moderation?onglet=${o}`}
              aria-current={o === onglet ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                o === onglet ? "bg-action text-sur-action" : "border border-ligne bg-surface text-prune-nuit"
              }`}
            >
              {libelle}
            </Link>
          ))}
        </nav>

        {erreur && (
          <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
            {erreur}
          </p>
        )}

        {onglet === "signalements" && <Signalements />}
        {onglet === "masquees" && <Masquees />}
        {onglet === "membres" && <Membres recherche={q} estAdmin={estAdmin} />}
        {onglet === "journal" && <Journal />}
      </main>
    </div>
  );
}

async function Signalements() {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("signalements")
    .select("id, motif, details, cree_le, annonces(id, titre, moderation), auteur_profil:profils!signalements_auteur_fkey(pseudo)")
    .eq("statut", "ouvert")
    .order("cree_le")
    .limit(100);
  const signalements = (data ?? []) as unknown as Signalement[];

  if (!signalements.length) return <Vide texte="Aucun signalement en attente." />;

  return (
    <ul className="grid gap-3">
      {signalements.map((s) => (
        <li key={s.id} className="grid gap-3 rounded-carte border border-ligne bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-titre font-semibold text-prune-nuit">
              {MOTIFS[s.motif] ?? s.motif}
              {s.annonces && (
                <>
                  {" · "}
                  <Link href={`/annonces/${s.annonces.id}`} className="text-prune hover:underline">
                    {s.annonces.titre}
                  </Link>
                </>
              )}
            </span>
            <span className="text-xs text-mauve">
              par {s.auteur_profil?.pseudo ?? "compte supprimé"} · {formaterDateRelative(s.cree_le)}
            </span>
          </div>
          {s.details && <p className="text-sm whitespace-pre-line text-prune-nuit">{s.details}</p>}
          {s.annonces?.moderation === "masquee" && <p className="text-xs font-semibold text-mauve">Annonce déjà masquée</p>}
          <div className="flex flex-wrap items-center gap-2">
            {s.annonces && s.annonces.moderation !== "masquee" && (
              <form action={modererAnnonce.bind(null, s.annonces.id, true, s.id)} className="flex min-w-[16rem] flex-1 gap-2">
                <input type="hidden" name="onglet" value="signalements" />
                <label className="sr-only" htmlFor={`motif-${s.id}`}>Motif du masquage</label>
                <input id={`motif-${s.id}`} name="motif" placeholder="Motif (journal)" className={champMotif} />
                <button type="submit" className={boutonFort}>Masquer l&apos;annonce</button>
              </form>
            )}
            <form action={rejeterSignalement.bind(null, s.id)}>
              <input type="hidden" name="onglet" value="signalements" />
              <button type="submit" className={bouton}>
                {s.annonces?.moderation === "masquee" ? "Clore" : "Rejeter"}
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Masquees() {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("annonces")
    .select("id, titre, modifie_le, profils!annonces_vendeur_fkey(pseudo)")
    .eq("moderation", "masquee")
    .order("modifie_le", { ascending: false })
    .limit(100);
  const annonces = (data ?? []) as unknown as { id: string; titre: string; modifie_le: string; profils: { pseudo: string } | null }[];

  if (!annonces.length) return <Vide texte="Aucune annonce masquée." />;

  return (
    <ul className="grid gap-3">
      {annonces.map((a) => (
        <li key={a.id} className="grid gap-3 rounded-carte border border-ligne bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link href={`/annonces/${a.id}`} className="font-titre font-semibold text-prune hover:underline">
              {a.titre}
            </Link>
            <span className="text-xs text-mauve">{a.profils?.pseudo ?? "Membre"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={modererAnnonce.bind(null, a.id, false, null)}>
              <input type="hidden" name="onglet" value="masquees" />
              <button type="submit" className={bouton}>Réafficher</button>
            </form>
            <form action={supprimerAnnonceModeration.bind(null, a.id)} className="flex min-w-[16rem] flex-1 gap-2">
              <input type="hidden" name="onglet" value="masquees" />
              <label className="sr-only" htmlFor={`suppr-${a.id}`}>Motif de la suppression</label>
              <input id={`suppr-${a.id}`} name="motif" required placeholder="Motif de suppression (obligatoire)" className={champMotif} />
              <button type="submit" className={boutonFort}>Supprimer définitivement</button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Membres({ recherche, estAdmin }: { recherche?: string; estAdmin: boolean }) {
  const supabase = await creerClientServeur();
  const { data } = await supabase.rpc("membres_moderation", { recherche: recherche?.trim() || null });
  const membres = (data ?? []) as { id: string; pseudo: string; role: string; bloque: boolean; cree_le: string; nb_annonces: number }[];

  return (
    <div className="grid gap-4">
      <form action="/moderation" className="flex gap-2">
        <input type="hidden" name="onglet" value="membres" />
        <label htmlFor="q" className="sr-only">Rechercher un pseudo</label>
        <input id="q" name="q" type="search" defaultValue={recherche} placeholder="Rechercher un pseudo" className={`${champMotif} py-2.5 text-sm`} />
        <button type="submit" className={boutonFort}>Rechercher</button>
      </form>

      {!membres.length ? (
        <Vide texte="Aucun membre trouvé." />
      ) : (
        <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
          {membres.map((m) => (
            <li key={m.id} className="grid gap-2 border-b border-ligne p-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid gap-0.5">
                <span className="font-titre font-semibold text-prune-nuit">
                  {m.pseudo}
                  {m.bloque && <span className="ml-2 rounded-full border border-abricot px-2 py-0.5 text-xs">Bloqué</span>}
                </span>
                <span className="text-xs text-mauve">
                  {ROLES[m.role]} · {m.nb_annonces} annonce{m.nb_annonces > 1 ? "s" : ""} · inscrit {formaterDateRelative(m.cree_le)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={bloquerCompte.bind(null, m.id, !m.bloque)} className="flex gap-2">
                  <input type="hidden" name="onglet" value="membres" />
                  {!m.bloque && (
                    <>
                      <label className="sr-only" htmlFor={`bloc-${m.id}`}>Motif du blocage</label>
                      <input id={`bloc-${m.id}`} name="motif" placeholder="Motif" className={`${champMotif} w-32`} />
                    </>
                  )}
                  <button type="submit" className={m.bloque ? bouton : boutonFort}>
                    {m.bloque ? "Débloquer" : "Bloquer"}
                  </button>
                </form>
                {estAdmin && (
                  <form action={changerRole.bind(null, m.id)} className="flex gap-2">
                    <input type="hidden" name="onglet" value="membres" />
                    <label className="sr-only" htmlFor={`role-${m.id}`}>Rôle de {m.pseudo}</label>
                    <select id={`role-${m.id}`} name="role" defaultValue={m.role} className={`${champMotif} flex-none`}>
                      {Object.entries(ROLES).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button type="submit" className={bouton}>Appliquer</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ACTIONS: Record<string, string> = {
  premier_administrateur: "Premier administrateur nommé",
  changement_role: "Rôle modifié",
  annonce_masquee: "Annonce masquée",
  annonce_reaffichee: "Annonce réaffichée",
  annonce_supprimee: "Annonce supprimée",
  signalement_traite: "Signalement traité",
  signalement_rejete: "Signalement rejeté",
  membre_bloque: "Membre bloqué",
  membre_debloque: "Membre débloqué",
  compte_supprime: "Compte supprimé par son titulaire",
};

async function Journal() {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("journal_audit")
    .select("id, acteur, action, cible_type, cible_id, details, cree_le")
    .order("cree_le", { ascending: false })
    .limit(100);
  const lignes = (data ?? []) as {
    id: number;
    acteur: string | null;
    action: string;
    cible_type: string;
    cible_id: string;
    details: Record<string, unknown>;
    cree_le: string;
  }[];

  if (!lignes.length) return <Vide texte="Le journal est vide." />;

  // L'acteur référence le compte de connexion : on retrouve son pseudo à part
  const ids = [...new Set(lignes.map((l) => l.acteur).filter((a): a is string => Boolean(a)))];
  const { data: profils } = ids.length ? await supabase.from("profils").select("id, pseudo").in("id", ids) : { data: [] };
  const pseudos = new Map((profils ?? []).map((p) => [p.id, p.pseudo]));

  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
  return (
    <div className="overflow-x-auto rounded-carte border border-ligne bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="text-xs tracking-wider text-mauve uppercase">
          <tr>
            <th className="p-3">Date</th>
            <th className="p-3">Action</th>
            <th className="p-3">Par</th>
            <th className="p-3">Détails</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} className="border-t border-ligne align-top text-prune-nuit">
              <td className="p-3 whitespace-nowrap tabular-nums">{date.format(new Date(l.cree_le))}</td>
              <td className="p-3">{ACTIONS[l.action] ?? l.action}</td>
              <td className="p-3">{(l.acteur && pseudos.get(l.acteur)) ?? "Système"}</td>
              <td className="p-3 text-xs text-mauve">
                {Object.entries(l.details ?? {})
                  .filter(([, v]) => v !== null && v !== "")
                  .map(([k, v]) => `${k} : ${String(v)}`)
                  .join(" · ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="rounded-carte border border-ligne bg-surface p-6 text-mauve">{texte}</p>;
}
