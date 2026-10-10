import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { formaterDateRelative, formaterPrix } from "@/lib/annonces";
import { libellesCommande, type StatutCommande } from "@/lib/commandes";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Achats et ventes | Troqly" };

type Ligne = {
  id: string;
  titre: string;
  acheteur: string | null;
  prix_centimes: number;
  total_centimes: number;
  statut: StatutCommande;
  cree_le: string;
};

export default async function PageCommandes() {
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect("/connexion?suivant=/commandes");

  const { data } = await supabase
    .from("commandes")
    .select("id, titre, acheteur, prix_centimes, total_centimes, statut, cree_le")
    .or(`acheteur.eq.${moi},vendeur.eq.${moi}`)
    .neq("statut", "en_attente")
    .order("cree_le", { ascending: false })
    .limit(100);
  const commandes = (data ?? []) as Ligne[];
  const achats = commandes.filter((c) => c.acheteur === moi);
  const ventes = commandes.filter((c) => c.acheteur !== moi);

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-3xl gap-8 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Achats et ventes</h1>
        <Liste titre="Mes achats" commandes={achats} montant={(c) => c.total_centimes} vide="Aucun achat pour l'instant." />
        <Liste titre="Mes ventes" commandes={ventes} montant={(c) => c.prix_centimes} vide="Aucune vente payée en ligne pour l'instant." />
      </main>
    </div>
  );
}

function Liste({
  titre,
  commandes,
  montant,
  vide,
}: {
  titre: string;
  commandes: Ligne[];
  montant: (c: Ligne) => number;
  vide: string;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-titre text-xl font-semibold text-prune-nuit">{titre}</h2>
      {commandes.length === 0 ? (
        <p className="rounded-carte border border-ligne bg-surface p-5 text-mauve">{vide}</p>
      ) : (
        <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
          {commandes.map((c) => (
            <li key={c.id} className="border-b border-ligne last:border-b-0">
              <Link href={`/commandes/${c.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-ivoire">
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate font-titre font-semibold text-prune-nuit">{c.titre}</span>
                  <span className="text-xs text-mauve">
                    {libellesCommande[c.statut]} · {formaterDateRelative(c.cree_le)}
                  </span>
                </span>
                <span className="shrink-0 font-titre font-semibold tabular-nums text-prune-nuit">{formaterPrix(montant(c))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
