import { z } from "zod";

export const schemaEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Saisissez une adresse e-mail valide." }));

// 72 octets : limite de bcrypt côté Supabase
export const schemaMotDePasse = z
  .string()
  .min(12, { error: "Le mot de passe doit faire au moins 12 caractères." })
  .max(72, { error: "Le mot de passe doit faire au plus 72 caractères." })
  .regex(/[a-zà-ÿ]/i, { error: "Le mot de passe doit contenir au moins une lettre." })
  .regex(/[0-9]/, { error: "Le mot de passe doit contenir au moins un chiffre." });

export const schemaPseudo = z
  .string()
  .trim()
  .min(3, { error: "Le pseudo doit faire au moins 3 caractères." })
  .max(30, { error: "Le pseudo doit faire au plus 30 caractères." })
  .regex(/^[\p{L}\p{N} ._-]+$/u, {
    error: "Le pseudo ne peut contenir que des lettres, chiffres, espaces, points, tirets et soulignés.",
  });

export const schemaVille = z
  .string()
  .trim()
  .max(80, { error: "La ville doit faire au plus 80 caractères." });

const nomPropre = (libelle: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `Saisissez votre ${libelle}.` })
    .max(50, { error: `Votre ${libelle} doit faire au plus 50 caractères.` })
    .regex(/^[\p{L}][\p{L} '’-]*$/u, { error: `Votre ${libelle} ne peut contenir que des lettres, espaces, tirets et apostrophes.` });

export const schemaPrenom = nomPropre("prénom");
export const schemaNom = nomPropre("nom");

export function ageLe(naissance: Date, aujourdHui = new Date()) {
  let age = aujourdHui.getUTCFullYear() - naissance.getUTCFullYear();
  const mois = aujourdHui.getUTCMonth() - naissance.getUTCMonth();
  if (mois < 0 || (mois === 0 && aujourdHui.getUTCDate() < naissance.getUTCDate())) age--;
  return age;
}

// Date au format AAAA-MM-JJ (champ date du navigateur), personne majeure
export const schemaDateNaissance = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Saisissez votre date de naissance." })
  .refine(
    (v) => {
      const [a, m, j] = v.split("-").map(Number);
      const d = new Date(Date.UTC(a, m - 1, j));
      return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
    },
    { error: "Cette date de naissance n'existe pas." },
  )
  .refine((v) => ageLe(new Date(`${v}T00:00:00Z`)) >= 18, { error: "Troqly est réservé aux personnes majeures." })
  .refine((v) => ageLe(new Date(`${v}T00:00:00Z`)) <= 120, { error: "Vérifiez votre date de naissance." });

// Numéro français facultatif, enregistré au format +33XXXXXXXXX
export const schemaTelephone = z
  .string()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .refine((v) => v === "" || /^(?:\+33|0033|0)[1-9]\d{8}$/.test(v), {
    error: "Saisissez un numéro français, par exemple 06 12 34 56 78.",
  })
  .transform((v) => (v === "" ? "" : `+33${v.slice(-9)}`));

export const schemaInscription = z.object({
  prenom: schemaPrenom,
  nom: schemaNom,
  dateNaissance: schemaDateNaissance,
  pseudo: schemaPseudo,
  email: schemaEmail,
  telephone: schemaTelephone,
  motDePasse: schemaMotDePasse,
});

export const schemaConnexion = z.object({
  email: schemaEmail,
  motDePasse: z.string().min(1, { error: "Saisissez votre mot de passe." }),
});

export const schemaProfil = z.object({
  prenom: schemaPrenom,
  nom: schemaNom,
  pseudo: schemaPseudo,
  ville: schemaVille,
  telephone: schemaTelephone,
});

export function premiereErreur(erreur: z.ZodError) {
  return erreur.issues[0]?.message ?? "Le formulaire contient une erreur.";
}

// N'accepte qu'un chemin interne, pour éviter les redirections vers un autre site
export function cheminSur(valeur: unknown, parDefaut = "/compte") {
  if (typeof valeur !== "string") return parDefaut;
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.startsWith("/\\")) return parDefaut;
  return valeur;
}
