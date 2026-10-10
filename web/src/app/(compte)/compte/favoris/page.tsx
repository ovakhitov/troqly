import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { SELECTION_CARTE, versCarte, type LigneCarte } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Mes favoris | Troqly" };

export default async function PageFavoris() {
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const id = session?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/compte/favoris");

  const { data } = await supabase
    .from("favoris")
    .select(`cree_le, annonces(${SELECTION_CARTE})`)
    .eq("membre", id)
    .order("cree_le", { ascending: false });

  // Une annonce masquée ou supprimée disparaît de la liste
  const annonces = (data ?? [])
    .map((f) => f.annonces as unknown as LigneCarte | null)
    .filter((a): a is LigneCarte => Boolean(a))
    .map(versCarte);

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Mes favoris</h1>
          <Link href="/compte" className="text-sm font-semibold text-prune hover:underline">
            Mon compte
          </Link>
        </div>
        {annonces.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
            <p className="font-titre text-lg font-semibold text-prune-nuit">Aucun favori pour l&apos;instant.</p>
            <p className="text-mauve">Sur une annonce, cliquez sur « Ajouter aux favoris » pour la retrouver ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {annonces.map((a) => (
              <CarteAnnonce key={a.id} annonce={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
