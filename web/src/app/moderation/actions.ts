"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Chaque fonction SQL vérifie elle-même le rôle et inscrit l'action au journal.
// En cas de refus, on revient sur l'onglet avec le message renvoyé par la base.

function motifDe(formData: FormData) {
  const m = String(formData.get("motif") ?? "").trim().slice(0, 300);
  return m || null;
}

function terminer(formData: FormData, erreur?: { message: string } | null): never {
  const onglet = String(formData.get("onglet") ?? "signalements");
  revalidatePath("/moderation");
  const p = new URLSearchParams({ onglet });
  if (erreur) p.set("erreur", erreur.message.slice(0, 200));
  redirect(`/moderation?${p}`);
}

export async function modererAnnonce(idAnnonce: string, masquer: boolean, idSignalement: number | null, formData: FormData) {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("moderer_annonce", { id_annonce: idAnnonce, masquer, motif: motifDe(formData) });
  if (!error && idSignalement !== null) {
    const r = await supabase.rpc("traiter_signalement", { id_signalement: idSignalement, decision: "traite" });
    terminer(formData, r.error);
  }
  terminer(formData, error);
}

export async function supprimerAnnonceModeration(idAnnonce: string, formData: FormData) {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("supprimer_annonce_moderation", {
    id_annonce: idAnnonce,
    motif: motifDe(formData) ?? "Non précisé",
  });
  terminer(formData, error);
}

export async function rejeterSignalement(idSignalement: number, formData: FormData) {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("traiter_signalement", { id_signalement: idSignalement, decision: "rejete" });
  terminer(formData, error);
}

export async function bloquerCompte(idMembre: string, bloquer: boolean, formData: FormData) {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("bloquer_membre", { id_membre: idMembre, bloquer, motif: motifDe(formData) });
  terminer(formData, error);
}

export async function changerRole(idMembre: string, formData: FormData) {
  const role = formData.get("role");
  if (role !== "utilisateur" && role !== "moderateur" && role !== "administrateur") terminer(formData);
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("definir_role", { cible: idMembre, nouveau: role });
  terminer(formData, error);
}
