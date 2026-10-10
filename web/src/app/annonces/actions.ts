"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BUCKET_PHOTOS, lireFormulaireAnnonce, schemaAnnonce, type StatutAnnonce } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { premiereErreur } from "@/lib/validation";

// Les valeurs saisies reviennent avec l'erreur : React réinitialise le formulaire après l'envoi
export type EtatAnnonce = {
  erreur?: string;
  valeurs?: Omit<ReturnType<typeof lireFormulaireAnnonce>, "photos">;
};

function echec(erreur: string, formData: FormData): EtatAnnonce {
  const { titre, description, prix, categorie, ville, codePostal, mainPropre, livraison } = lireFormulaireAnnonce(formData);
  return { erreur, valeurs: { titre, description, prix, categorie, ville, codePostal, mainPropre, livraison } };
}

async function utilisateurConnecte() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/deposer");
  return { supabase, id };
}

const ENVOI_EN_COURS = "Attendez la fin de l'envoi des photos, puis réessayez.";

export async function creerAnnonce(_: EtatAnnonce, formData: FormData): Promise<EtatAnnonce> {
  if (formData.get("envoiEnCours")) return echec(ENVOI_EN_COURS, formData);
  const { supabase, id } = await utilisateurConnecte();

  const resultat = schemaAnnonce(id).safeParse(lireFormulaireAnnonce(formData));
  if (!resultat.success) return echec(premiereErreur(resultat.error), formData);
  const a = resultat.data;

  const { data: annonce, error } = await supabase
    .from("annonces")
    .insert({
      vendeur: id,
      titre: a.titre,
      description: a.description,
      prix_centimes: a.prix,
      categorie: a.categorie,
      ville: a.ville,
      code_postal: a.codePostal,
      main_propre: a.mainPropre,
      livraison: a.livraison,
    })
    .select("id")
    .single();

  if (error || !annonce) {
    if (error?.code === "42501") {
      return echec("Complétez vos informations personnelles dans « Mon compte » avant de déposer une annonce.", formData);
    }
    return echec("L'annonce n'a pas pu être publiée. Vérifiez les champs puis réessayez.", formData);
  }

  const { error: erreurPhotos } = await supabase
    .from("photos_annonces")
    .insert(a.photos.map((chemin, position) => ({ annonce: annonce.id, chemin, position })));

  if (erreurPhotos) {
    await supabase.from("annonces").delete().eq("id", annonce.id);
    return echec("Les photos n'ont pas pu être enregistrées. Réessayez.", formData);
  }

  revalidatePath("/");
  revalidatePath("/annonces");
  redirect(`/annonces/${annonce.id}?publiee=1`);
}

export async function modifierAnnonce(
  idAnnonce: string,
  _: EtatAnnonce,
  formData: FormData,
): Promise<EtatAnnonce> {
  if (formData.get("envoiEnCours")) return echec(ENVOI_EN_COURS, formData);
  const { supabase, id } = await utilisateurConnecte();

  const resultat = schemaAnnonce(id).safeParse(lireFormulaireAnnonce(formData));
  if (!resultat.success) return echec(premiereErreur(resultat.error), formData);
  const a = resultat.data;

  const { data: avant } = await supabase
    .from("photos_annonces")
    .select("chemin")
    .eq("annonce", idAnnonce);

  const { data: maj, error } = await supabase
    .from("annonces")
    .update({
      titre: a.titre,
      description: a.description,
      prix_centimes: a.prix,
      categorie: a.categorie,
      ville: a.ville,
      code_postal: a.codePostal,
      main_propre: a.mainPropre,
      livraison: a.livraison,
    })
    .eq("id", idAnnonce)
    .eq("vendeur", id)
    .select("id");

  if (error || !maj?.length) return echec("L'annonce n'a pas pu être modifiée. Réessayez.", formData);

  // Remplace la liste des photos dans l'ordre choisi
  await supabase.from("photos_annonces").delete().eq("annonce", idAnnonce);
  const { error: erreurPhotos } = await supabase
    .from("photos_annonces")
    .insert(a.photos.map((chemin, position) => ({ annonce: idAnnonce, chemin, position })));
  if (erreurPhotos) return echec("Les photos n'ont pas pu être enregistrées. Réessayez.", formData);

  const retirees = (avant ?? []).map((p) => p.chemin).filter((c) => !a.photos.includes(c));
  if (retirees.length) await supabase.storage.from(BUCKET_PHOTOS).remove(retirees);

  revalidatePath("/");
  revalidatePath("/annonces");
  redirect(`/annonces/${idAnnonce}`);
}

export async function changerStatut(idAnnonce: string, statut: StatutAnnonce) {
  const { supabase, id } = await utilisateurConnecte();
  await supabase.from("annonces").update({ statut }).eq("id", idAnnonce).eq("vendeur", id);
  revalidatePath(`/annonces/${idAnnonce}`);
  revalidatePath("/annonces");
  revalidatePath("/compte/annonces");
}

export async function supprimerAnnonce(idAnnonce: string) {
  const { supabase, id } = await utilisateurConnecte();

  const { data: photos } = await supabase.from("photos_annonces").select("chemin").eq("annonce", idAnnonce);
  const { error } = await supabase.from("annonces").delete().eq("id", idAnnonce).eq("vendeur", id);
  if (!error && photos?.length) {
    await supabase.storage.from(BUCKET_PHOTOS).remove(photos.map((p) => p.chemin));
  }

  revalidatePath("/");
  revalidatePath("/annonces");
  redirect("/compte/annonces?supprimee=1");
}

// Photo envoyée puis retirée avant publication
export async function retirerPhotoNonPubliee(chemin: string) {
  const { supabase, id } = await utilisateurConnecte();
  if (!chemin.startsWith(`${id}/`)) return;
  const { data } = await supabase.from("photos_annonces").select("id").eq("chemin", chemin).maybeSingle();
  if (!data) await supabase.storage.from(BUCKET_PHOTOS).remove([chemin]);
}
