"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/serveur";
import {
  cheminSur,
  premiereErreur,
  schemaConnexion,
  schemaEmail,
  schemaInscription,
  schemaMotDePasse,
  schemaProfil,
} from "@/lib/validation";

export type EtatFormulaire = {
  erreur?: string;
  succes?: string;
  valeurs?: Record<string, string>;
};

async function origine() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3001";
}

function texte(formData: FormData, cle: string) {
  const v = formData.get(cle);
  return typeof v === "string" ? v : "";
}

export async function inscrire(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const valeurs = {
    prenom: texte(formData, "prenom"),
    nom: texte(formData, "nom"),
    dateNaissance: texte(formData, "dateNaissance"),
    pseudo: texte(formData, "pseudo"),
    email: texte(formData, "email"),
    telephone: texte(formData, "telephone"),
  };
  const resultat = schemaInscription.safeParse({ ...valeurs, motDePasse: texte(formData, "motDePasse") });
  if (!resultat.success) return { erreur: premiereErreur(resultat.error), valeurs };

  const { prenom, nom, dateNaissance, pseudo, email, telephone, motDePasse } = resultat.data;
  const supabase = await creerClientServeur();
  // Les informations privées sont déplacées dans leur table par la base dès la création du compte
  const { error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
    options: {
      emailRedirectTo: `${await origine()}/auth/confirmer?suivant=/compte`,
      data: { pseudo, prenom, nom, date_naissance: dateNaissance, telephone: telephone || null },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { erreur: "Ce mot de passe est trop faible ou connu. Choisissez-en un autre.", valeurs };
    }
    if (error.status === 429) {
      return { erreur: "Trop de tentatives. Réessayez dans quelques minutes.", valeurs };
    }
    return { erreur: "L'inscription n'a pas abouti. Réessayez dans un instant.", valeurs };
  }

  // Même message que l'adresse soit nouvelle ou déjà utilisée, pour ne rien révéler
  return {
    succes: `Presque terminé : ouvrez le lien envoyé à ${email} pour confirmer votre adresse.`,
  };
}

export async function connecter(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const valeurs = { email: texte(formData, "email") };
  const resultat = schemaConnexion.safeParse({ ...valeurs, motDePasse: texte(formData, "motDePasse") });
  if (!resultat.success) return { erreur: premiereErreur(resultat.error), valeurs };

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultat.data.email,
    password: resultat.data.motDePasse,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { erreur: "Confirmez d'abord votre adresse avec le lien reçu par e-mail.", valeurs };
    }
    if (error.status === 429) {
      return { erreur: "Trop de tentatives. Réessayez dans quelques minutes.", valeurs };
    }
    return { erreur: "Adresse e-mail ou mot de passe incorrect.", valeurs };
  }

  redirect(cheminSur(formData.get("suivant")));
}

export async function deconnecter() {
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
  redirect("/");
}

export async function demanderReinitialisation(
  _: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const valeurs = { email: texte(formData, "email") };
  const resultat = schemaEmail.safeParse(valeurs.email);
  if (!resultat.success) return { erreur: premiereErreur(resultat.error), valeurs };

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.resetPasswordForEmail(resultat.data, {
    redirectTo: `${await origine()}/auth/confirmer?suivant=/compte/mot-de-passe`,
  });
  if (error?.status === 429) {
    return { erreur: "Trop de demandes. Réessayez dans quelques minutes.", valeurs };
  }

  return {
    succes: "Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe.",
  };
}

export async function changerMotDePasse(
  _: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const motDePasse = texte(formData, "motDePasse");
  if (motDePasse !== texte(formData, "confirmation")) {
    return { erreur: "Les deux mots de passe ne sont pas identiques." };
  }
  const resultat = schemaMotDePasse.safeParse(motDePasse);
  if (!resultat.success) return { erreur: premiereErreur(resultat.error) };

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.updateUser({ password: resultat.data });
  if (error) {
    if (error.code === "same_password") {
      return { erreur: "Choisissez un mot de passe différent de l'ancien." };
    }
    if (error.code === "weak_password") {
      return { erreur: "Ce mot de passe est trop faible ou connu. Choisissez-en un autre." };
    }
    return { erreur: "Le mot de passe n'a pas pu être changé. Reconnectez-vous puis réessayez." };
  }
  return { succes: "Votre mot de passe a été changé." };
}

export async function modifierProfil(_: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const valeurs = {
    prenom: texte(formData, "prenom"),
    nom: texte(formData, "nom"),
    pseudo: texte(formData, "pseudo"),
    ville: texte(formData, "ville"),
    telephone: texte(formData, "telephone"),
  };
  const resultat = schemaProfil.safeParse(valeurs);
  if (!resultat.success) return { erreur: premiereErreur(resultat.error), valeurs };

  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/compte");

  const { prenom, nom, pseudo, ville, telephone } = resultat.data;
  const [publiques, privees] = await Promise.all([
    supabase.from("profils").update({ pseudo, ville: ville || null }).eq("id", id),
    supabase.from("informations_privees").update({ prenom, nom, telephone: telephone || null }).eq("id", id),
  ]);
  if (publiques.error || privees.error) {
    return { erreur: "Le profil n'a pas pu être enregistré. Réessayez.", valeurs };
  }

  return { succes: "Profil enregistré.", valeurs };
}
