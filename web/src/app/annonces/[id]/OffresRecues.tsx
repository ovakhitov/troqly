import { ReponseOffre } from "@/components/ReponseOffre";
import { COLONNES_OFFRE, type Offre } from "@/lib/offres";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Offres en attente sur l'annonce, visibles par le vendeur seulement
export async function OffresRecues({ idAnnonce, prixCentimes }: { idAnnonce: string; prixCentimes: number }) {
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("offres")
    .select(`${COLONNES_OFFRE}, acheteur_profil:profils!offres_acheteur_fkey(pseudo)`)
    .eq("annonce", idAnnonce)
    .eq("statut", "en_attente")
    .order("cree_le");
  const offres = (data ?? []) as unknown as (Offre & { acheteur_profil: { pseudo: string } | null })[];
  if (!offres.length) return null;

  return (
    <section className="grid gap-3 rounded-carte border border-ligne bg-surface p-5" aria-label="Offres reçues">
      <h2 className="font-titre text-base font-semibold text-prune-nuit">
        Offres reçues ({offres.length})
      </h2>
      <ul className="grid gap-3">
        {offres.map((o) => (
          <ReponseOffre key={o.id} offre={o} pseudo={o.acheteur_profil?.pseudo ?? "Membre"} prixAnnonce={prixCentimes} />
        ))}
      </ul>
    </section>
  );
}
