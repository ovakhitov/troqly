"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdmin, journaliser } from "@/lib/admin";
import { stripe } from "@/lib/stripe";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { verserAuVendeur } from "@/lib/versement";

// Chaque action vérifie le rôle administrateur, laisse une trace au journal,
// puis revient sur la page d'origine avec un message de réussite ou d'erreur.
// Les actions qui touchent à l'argent ou suppriment des données exigent une case « Je confirme ».

function retour(formData: FormData, message: { ok?: string; erreur?: string }): never {
  const page = String(formData.get("retour") ?? "/admin");
  const chemin = page.startsWith("/admin") ? page : "/admin";
  revalidatePath("/admin", "layout");
  const url = new URL(chemin, "http://troqly.local");
  url.searchParams.delete("ok");
  url.searchParams.delete("erreur");
  if (message.ok) url.searchParams.set("ok", message.ok);
  if (message.erreur) url.searchParams.set("erreur", message.erreur.slice(0, 200));
  redirect(`${url.pathname}${url.search}`);
}

function confirme(formData: FormData) {
  return formData.get("confirme") === "on";
}

function motifDe(formData: FormData) {
  return String(formData.get("motif") ?? "").trim().slice(0, 300) || null;
}

// Argent ----------------------------------------------------------------------

export async function rembourserCommande(idCommande: string, formData: FormData) {
  const { id, admin } = await exigerAdmin();
  if (!confirme(formData)) retour(formData, { erreur: "Cochez la case de confirmation pour rembourser." });

  const { data: c } = await admin
    .from("commandes")
    .select("id, annonce, statut, total_centimes, stripe_paiement")
    .eq("id", idCommande)
    .maybeSingle();
  if (!c || (c.statut !== "payee" && c.statut !== "litige")) {
    retour(formData, { erreur: "Seule une commande payée ou en litige peut être remboursée." });
  }

  try {
    if (c.stripe_paiement) {
      await stripe().refunds.create({ payment_intent: c.stripe_paiement }, { idempotencyKey: `remboursement-${c.id}` });
    }
  } catch (e) {
    retour(formData, { erreur: `Stripe a refusé le remboursement : ${e instanceof Error ? e.message : "erreur inconnue"}` });
  }

  await admin.from("commandes").update({ statut: "remboursee" }).eq("id", c.id).in("statut", ["payee", "litige"]);
  if (c.annonce) await admin.from("annonces").update({ statut: "publiee" }).eq("id", c.annonce).eq("statut", "reservee");
  await journaliser(id, "commande_remboursee", { type: "commande", id: c.id }, { montant: c.total_centimes, motif: motifDe(formData) });
  retour(formData, { ok: "Commande remboursée intégralement à l'acheteur." });
}

export async function verserCommande(idCommande: string, formData: FormData) {
  const { id } = await exigerAdmin();
  if (!confirme(formData)) retour(formData, { erreur: "Cochez la case de confirmation pour verser l'argent au vendeur." });

  let verse = false;
  try {
    verse = await verserAuVendeur(idCommande);
  } catch (e) {
    retour(formData, { erreur: `Stripe a refusé le virement : ${e instanceof Error ? e.message : "erreur inconnue"}` });
  }
  if (!verse) {
    retour(formData, { erreur: "Virement impossible : la commande doit être payée et le vendeur avoir un compte de paiement." });
  }
  await journaliser(id, "commande_versee", { type: "commande", id: idCommande }, { motif: motifDe(formData) });
  retour(formData, { ok: "Vente terminée : la part du vendeur lui a été versée." });
}

// Un litige gèle la commande : ni le code de remise ni la confirmation de réception ne déclenchent le virement
export async function basculerLitige(idCommande: string, litige: boolean, formData: FormData) {
  const { id, admin } = await exigerAdmin();
  const { data } = await admin
    .from("commandes")
    .update({ statut: litige ? "litige" : "payee" })
    .eq("id", idCommande)
    .eq("statut", litige ? "payee" : "litige")
    .select("id")
    .maybeSingle();
  if (!data) retour(formData, { erreur: "Le statut de cette commande a changé entre-temps." });
  await journaliser(id, litige ? "commande_litige" : "commande_litige_levee", { type: "commande", id: idCommande }, { motif: motifDe(formData) });
  retour(formData, { ok: litige ? "Commande gelée en litige." : "Litige levé : la commande reprend son cours." });
}

export async function debloquerCode(idCommande: string, formData: FormData) {
  const { id, admin } = await exigerAdmin();
  await admin.from("commandes").update({ essais_code: 0 }).eq("id", idCommande).eq("statut", "payee");
  await journaliser(id, "code_debloque", { type: "commande", id: idCommande });
  retour(formData, { ok: "Le vendeur peut de nouveau saisir le code de remise (5 essais)." });
}

// Annonces --------------------------------------------------------------------

export async function boosterAnnonce(idAnnonce: string, formData: FormData) {
  const { id, admin } = await exigerAdmin();
  const jours = Number(formData.get("jours"));
  if (!Number.isInteger(jours) || jours < 0 || jours > 90) retour(formData, { erreur: "Durée de boost invalide." });
  const jusqua = jours === 0 ? null : new Date(Date.now() + jours * 86_400_000).toISOString();
  const { error } = await admin.from("annonces").update({ boost_jusqua: jusqua }).eq("id", idAnnonce);
  if (error) retour(formData, { erreur: error.message });
  await journaliser(id, jours ? "annonce_boostee" : "boost_arrete", { type: "annonce", id: idAnnonce }, { jours });
  retour(formData, { ok: jours ? `Annonce boostée pendant ${jours} jour${jours > 1 ? "s" : ""}.` : "Boost arrêté." });
}

// Masquer, réafficher et supprimer passent par les fonctions de la modération, qui journalisent elles-mêmes
export async function masquerAnnonce(idAnnonce: string, masquer: boolean, formData: FormData) {
  await exigerAdmin();
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("moderer_annonce", { id_annonce: idAnnonce, masquer, motif: motifDe(formData) });
  retour(formData, error ? { erreur: error.message } : { ok: masquer ? "Annonce masquée." : "Annonce réaffichée." });
}

export async function supprimerAnnonce(idAnnonce: string, formData: FormData) {
  await exigerAdmin();
  if (!confirme(formData)) retour(formData, { erreur: "Cochez la case de confirmation pour supprimer l'annonce." });
  const motif = motifDe(formData);
  if (!motif) retour(formData, { erreur: "Indiquez le motif de la suppression." });
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("supprimer_annonce_moderation", { id_annonce: idAnnonce, motif });
  retour(formData, error ? { erreur: error.message } : { ok: "Annonce supprimée définitivement." });
}

// Comptes ---------------------------------------------------------------------

export async function bloquerMembre(idMembre: string, bloquer: boolean, formData: FormData) {
  await exigerAdmin();
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("bloquer_membre", { id_membre: idMembre, bloquer, motif: motifDe(formData) });
  retour(formData, error ? { erreur: error.message } : { ok: bloquer ? "Compte bloqué." : "Compte débloqué." });
}

export async function changerRoleMembre(idMembre: string, formData: FormData) {
  await exigerAdmin();
  const role = formData.get("role");
  if (role !== "utilisateur" && role !== "moderateur" && role !== "administrateur") retour(formData, { erreur: "Rôle inconnu." });
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("definir_role", { cible: idMembre, nouveau: role });
  retour(formData, error ? { erreur: error.message } : { ok: "Rôle modifié." });
}

export async function supprimerMembre(idMembre: string, formData: FormData) {
  const { id, admin } = await exigerAdmin();
  if (idMembre === id) retour(formData, { erreur: "Supprimez votre propre compte depuis « Mon compte »." });

  const { data: p } = await admin.from("profils").select("pseudo, role").eq("id", idMembre).maybeSingle();
  if (!p) retour(formData, { erreur: "Compte introuvable." });
  if (!confirme(formData) || String(formData.get("pseudo") ?? "").trim() !== p.pseudo) {
    retour(formData, { erreur: `Pour supprimer ce compte, cochez la confirmation et recopiez le pseudo « ${p.pseudo} ».` });
  }
  if (p.role === "administrateur") retour(formData, { erreur: "Retirez d'abord le rôle administrateur de ce compte." });

  // Pas de suppression tant qu'une vente payée attend sa remise : l'argent serait bloqué
  const { count } = await admin
    .from("commandes")
    .select("id", { count: "exact", head: true })
    .or(`acheteur.eq.${idMembre},vendeur.eq.${idMembre}`)
    .in("statut", ["payee", "litige"]);
  if (count) retour(formData, { erreur: "Ce compte a des commandes en cours : remboursez-les ou terminez-les d'abord." });

  await journaliser(id, "compte_supprime_admin", { type: "profil", id: idMembre }, { pseudo: p.pseudo, motif: motifDe(formData) });
  // Supprime le compte de connexion ; profil, annonces, messages et favoris suivent en cascade.
  // Les commandes passées gardent leurs copies (titre, montants) pour la comptabilité.
  const { error } = await admin.auth.admin.deleteUser(idMembre);
  if (error) retour(formData, { erreur: error.message });

  formData.set("retour", "/admin/membres");
  retour(formData, { ok: `Le compte « ${p.pseudo} » a été supprimé.` });
}
