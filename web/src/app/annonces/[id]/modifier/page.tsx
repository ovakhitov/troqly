import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireAnnonce } from "@/components/FormulaireAnnonce";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { modifierAnnonce } from "../../actions";

export const metadata: Metadata = { title: "Modifier l'annonce | Troqly" };

export default async function PageModifierAnnonce({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const idUtilisateur = session?.claims?.sub;
  if (!idUtilisateur) redirect(`/connexion?suivant=/annonces/${id}/modifier`);

  const [{ data: annonce }, { data: categories }] = await Promise.all([
    supabase
      .from("annonces")
      .select("id, vendeur, titre, description, prix_centimes, categorie, ville, code_postal, main_propre, livraison, photos_annonces(chemin, position)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("slug, libelle").order("ordre"),
  ]);
  if (!annonce || annonce.vendeur !== idUtilisateur) notFound();

  const prix = (annonce.prix_centimes / 100).toFixed(annonce.prix_centimes % 100 === 0 ? 0 : 2).replace(".", ",");

  return (
    <CadreCompte titre="Modifier l'annonce" large>
      <FormulaireAnnonce
        action={modifierAnnonce.bind(null, id)}
        idUtilisateur={idUtilisateur}
        categories={categories ?? []}
        libelleBouton="Enregistrer les modifications"
        initiales={{
          titre: annonce.titre,
          description: annonce.description,
          prix,
          categorie: annonce.categorie,
          ville: annonce.ville,
          codePostal: annonce.code_postal,
          mainPropre: annonce.main_propre,
          livraison: annonce.livraison,
          photos: [...(annonce.photos_annonces ?? [])].sort((a, b) => a.position - b.position).map((p) => p.chemin),
        }}
      />
    </CadreCompte>
  );
}
