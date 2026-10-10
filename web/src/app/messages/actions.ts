"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { premiereErreur } from "@/lib/validation";

export type EtatMessage = { erreur?: string; envoye?: number };

const schemaMessage = z
  .string()
  .trim()
  .min(1, { error: "Écrivez un message." })
  .max(2000, { error: "Un message fait au plus 2 000 caractères." });

async function connecte(suivant: string) {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect(`/connexion?suivant=${encodeURIComponent(suivant)}`);
  return { supabase, id };
}

export async function contacterVendeur(idAnnonce: string) {
  const { supabase } = await connecte(`/annonces/${idAnnonce}`);
  const { data, error } = await supabase.rpc("ouvrir_conversation", { id_annonce: idAnnonce });
  if (error || !data) redirect(`/annonces/${idAnnonce}?contact=impossible`);
  redirect(`/messages/${data}`);
}

export async function envoyerMessage(
  idConversation: string,
  etat: EtatMessage,
  formData: FormData,
): Promise<EtatMessage> {
  const { supabase, id } = await connecte(`/messages/${idConversation}`);
  const resultat = schemaMessage.safeParse(formData.get("contenu") ?? "");
  if (!resultat.success) return { erreur: premiereErreur(resultat.error) };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation: idConversation, auteur: id, contenu: resultat.data });
  if (error) {
    return {
      erreur:
        error.code === "42501"
          ? "Ce message ne peut pas être envoyé : l'un de vous a bloqué l'autre, ou votre compte est suspendu."
          : "Le message n'a pas pu être envoyé. Réessayez.",
    };
  }

  revalidatePath(`/messages/${idConversation}`);
  revalidatePath("/messages");
  return { envoye: (etat.envoye ?? 0) + 1 };
}

export async function marquerLu(idConversation: string) {
  const supabase = await creerClientServeur();
  await supabase.rpc("marquer_lu", { id_conversation: idConversation });
}

export async function bloquerMembre(idMembre: string, idConversation: string, bloquer: boolean) {
  const { supabase, id } = await connecte(`/messages/${idConversation}`);
  if (bloquer) {
    await supabase.from("blocages").insert({ bloqueur: id, bloque: idMembre });
  } else {
    await supabase.from("blocages").delete().eq("bloqueur", id).eq("bloque", idMembre);
  }
  revalidatePath(`/messages/${idConversation}`);
}
