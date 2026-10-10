import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Mes annonces | Troqly" };

export default async function PageMesAnnonces({ searchParams }: { searchParams: Promise<{ supprimee?: string }> }) {
  const { supprimee } = await searchParams;
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const id = session?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/compte/annonces");

  const { data } = await supabase
    .from("annonces")
    .select(`${SELECTION_CARTE}, moderation`)
    .eq("vendeur", id)
    .order("cree_le", { ascending: false });

  const annonces = data ?? [];

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Mes annonces</h1>
          <Link href="/compte" className="text-sm font-semibold text-prune hover:underline">
            Mon compte
          </Link>
        </div>

        {supprimee && (
          <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
            L&apos;annonce a été supprimée.
          </p>
        )}

        {annonces.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
            <p className="font-titre text-lg font-semibold text-prune-nuit">Vous n&apos;avez pas encore d&apos;annonce.</p>
            <Link
              href="/deposer"
              className="rounded-full bg-action px-6 py-3 font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
            >
              Déposer une annonce
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {annonces.map((a) => (
              <div key={a.id} className="grid content-start gap-2">
                <CarteAnnonce annonce={versCarte(a)} />
                {a.moderation === "masquee" && (
                  <p className="px-1 text-xs font-semibold text-prune-nuit">Masquée par la modération</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
