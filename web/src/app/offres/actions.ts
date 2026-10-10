"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prixEnCentimes } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export type EtatOffre = { erreur?: string; succes?: string };

async function connecte(suivant: string) {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(`/connexion?suivant=${encodeURIComponent(suivant)}`);
  return supabase;
}

function rafraichir(idAnnonce?: string) {
  if (idAnnonce) revalidatePath(`/annonces/${idAnnonce}`);
  revalidatePath("/offres");
}

// Les fonctions SQL vérifient l'annonce, les montants et les droits ; on reprend leur message
function messageBase(message: string) {
  if (/moitié|inférieure|entre l'offre/.test(message)) return message.replace(/''/g, "'") + ".";
  if (/indisponible/i.test(message)) return "Cette annonce n'est plus disponible.";
  if (/duplicate|unique/i.test(message)) return "Vous avez déjà une négociation en cours sur cette annonce.";
  return "L'opération n'a pas abouti. Réessayez.";
}

export async function faireOffre(idAnnonce: string, _: EtatOffre, formData: FormData): Promise<EtatOffre> {
  const supabase = await connecte(`/annonces/${idAnnonce}`);
  const montant = prixEnCentimes(String(formData.get("montant") ?? ""));
  if (montant === null) return { erreur: "Saisissez un montant en euros, par exemple 25 ou 12,50." };

  const { error } = await supabase.rpc("faire_offre", { id_annonce: idAnnonce, montant });
  if (error) return { erreur: messageBase(error.message) };
  rafraichir(idAnnonce);
  return { succes: "Offre envoyée. Le vendeur peut l'accepter, la refuser ou vous proposer un autre prix." };
}

export async function repondreOffre(idOffre: number, idAnnonce: string, decision: "accepter" | "refuser" | "contre", formData: FormData) {
  const supabase = await connecte("/offres");
  const contre = decision === "contre" ? prixEnCentimes(String(formData.get("contre") ?? "")) : null;
  const { error } = await supabase.rpc("repondre_offre", { id_offre: idOffre, decision, contre });
  rafraichir(idAnnonce);
  if (error) redirect(`/offres?erreur=${encodeURIComponent(messageBase(error.message))}`);
}

export async function reponseAcheteur(idOffre: number, idAnnonce: string, accepter: boolean) {
  const supabase = await connecte("/offres");
  const { error } = await supabase.rpc("reponse_acheteur", { id_offre: idOffre, accepter });
  rafraichir(idAnnonce);
  if (error) redirect(`/offres?erreur=${encodeURIComponent(messageBase(error.message))}`);
}
