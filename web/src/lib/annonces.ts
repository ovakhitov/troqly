import { z } from "zod";

export const BUCKET_PHOTOS = "photos-annonces";
export const PHOTOS_MAX = 8;

export type StatutAnnonce = "publiee" | "reservee" | "vendue";

export const libellesStatut: Record<StatutAnnonce, string> = {
  publiee: "Disponible",
  reservee: "Réservé",
  vendue: "Vendu",
};

// Colonnes nécessaires aux cartes de résultats
export const SELECTION_CARTE =
  "id, titre, prix_centimes, ville, statut, main_propre, livraison, cree_le, photos_annonces(chemin, position)";

type LigneCarte = {
  id: string;
  titre: string;
  prix_centimes: number;
  ville: string;
  statut: StatutAnnonce;
  main_propre: boolean;
  livraison: boolean;
  cree_le: string;
  photos_annonces: { chemin: string; position: number }[] | null;
};

export type DonneesCarte = {
  id: string;
  titre: string;
  prixCentimes: number;
  ville: string;
  statut: StatutAnnonce;
  mainPropre: boolean;
  livraison: boolean;
  creeLe: string;
  photo: string | null;
};

export function versCarte(l: LigneCarte): DonneesCarte {
  const premiere = [...(l.photos_annonces ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: l.id,
    titre: l.titre,
    prixCentimes: l.prix_centimes,
    ville: l.ville,
    statut: l.statut,
    mainPropre: l.main_propre,
    livraison: l.livraison,
    creeLe: l.cree_le,
    photo: premiere ? urlPhoto(premiere.chemin) : null,
  };
}

export function urlPhoto(chemin: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PHOTOS}/${chemin}`;
}

export function formaterPrix(centimes: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: centimes % 100 === 0 ? 0 : 2,
  }).format(centimes / 100);
}

const MS_JOUR = 86_400_000;

export function formaterDateRelative(iso: string, maintenant = new Date()) {
  const date = new Date(iso);
  const debutJour = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const jours = Math.round((debutJour(maintenant) - debutJour(date)) / MS_JOUR);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

// « 12 », « 12,50 », « 12.5 » ou « 1 250 » → centimes
export function prixEnCentimes(saisie: string) {
  const normalise = saisie.replace(/[\s €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalise)) return null;
  return Math.round(Number(normalise) * 100);
}

const schemaChemin = (idUtilisateur: string) =>
  z
    .string()
    .refine((c) => new RegExp(`^${idUtilisateur}/[0-9a-f-]{36}\\.(webp|jpg|png)$`).test(c), {
      error: "Une photo n'a pas pu être vérifiée. Retirez-la et ajoutez-la de nouveau.",
    });

export function schemaAnnonce(idUtilisateur: string) {
  return z
    .object({
      titre: z
        .string()
        .trim()
        .min(5, { error: "Le titre doit faire au moins 5 caractères." })
        .max(80, { error: "Le titre doit faire au plus 80 caractères." }),
      description: z
        .string()
        .trim()
        .min(20, { error: "Décrivez l'objet en au moins 20 caractères : état, dimensions, défauts…" })
        .max(4000, { error: "La description doit faire au plus 4 000 caractères." }),
      prix: z
        .string()
        .transform((v, ctx) => {
          const centimes = prixEnCentimes(v);
          if (centimes === null) {
            ctx.addIssue({ code: "custom", message: "Saisissez un prix en euros, par exemple 25 ou 12,50." });
            return z.NEVER;
          }
          return centimes;
        })
        .pipe(
          z
            .number()
            .min(100, { error: "Le prix minimum est de 1 €." })
            .max(100_000_000, { error: "Le prix maximum est de 1 000 000 €." }),
        ),
      categorie: z.string().regex(/^[a-z0-9-]+$/, { error: "Choisissez une catégorie." }),
      ville: z
        .string()
        .trim()
        .min(2, { error: "Indiquez la ville où se trouve l'objet." })
        .max(80, { error: "La ville doit faire au plus 80 caractères." }),
      codePostal: z
        .string()
        .trim()
        .regex(/^\d{5}$/, { error: "Le code postal doit compter 5 chiffres." }),
      mainPropre: z.boolean(),
      livraison: z.boolean(),
      photos: z
        .array(schemaChemin(idUtilisateur))
        .min(1, { error: "Ajoutez au moins une photo." })
        .max(PHOTOS_MAX, { error: `Une annonce compte ${PHOTOS_MAX} photos au maximum.` }),
    })
    .refine((a) => a.mainPropre || a.livraison, {
      error: "Choisissez au moins un mode de remise : main propre ou livraison.",
    });
}

export function lireFormulaireAnnonce(formData: FormData) {
  const texte = (cle: string) => {
    const v = formData.get(cle);
    return typeof v === "string" ? v : "";
  };
  return {
    titre: texte("titre"),
    description: texte("description"),
    prix: texte("prix"),
    categorie: texte("categorie"),
    ville: texte("ville"),
    codePostal: texte("codePostal"),
    mainPropre: formData.get("mainPropre") === "on",
    livraison: formData.get("livraison") === "on",
    photos: formData.getAll("photos").filter((p): p is string => typeof p === "string"),
  };
}
