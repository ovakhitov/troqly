// Données d'exemple affichées tant que Supabase n'est pas branché.
// Elles sont signalées comme exemples dans l'interface.

export type ModeRemise = "main-propre" | "livraison";
export type Statut = "disponible" | "reserve" | "vendu";

export type Annonce = {
  id: string;
  titre: string;
  prixCentimes: number;
  ville: string;
  publieeLe: string;
  statut: Statut;
  remise: ModeRemise[];
  // Dégradé de substitution en attendant les vraies photos
  visuel: string;
};

export const categories = [
  "Mode",
  "Maison",
  "Multimédia",
  "Vélos",
  "Enfants",
  "Loisirs",
  "Sport",
  "Bricolage",
];

export const annoncesExemple: Annonce[] = [
  {
    id: "ex-1",
    titre: "Vélo de ville Peugeot, cadre 54, révisé",
    prixCentimes: 12000,
    ville: "Lyon 7e",
    publieeLe: "aujourd'hui",
    statut: "disponible",
    remise: ["main-propre"],
    visuel:
      "radial-gradient(60% 70% at 30% 35%,#E8C9A8,transparent 70%),radial-gradient(50% 60% at 75% 70%,#7A9E8E,transparent 70%),#D9CFC4",
  },
  {
    id: "ex-2",
    titre: "Platine vinyle Technics SL-1500, avec cellule",
    prixCentimes: 18000,
    ville: "Villeurbanne",
    publieeLe: "hier",
    statut: "disponible",
    remise: ["main-propre", "livraison"],
    visuel:
      "radial-gradient(55% 60% at 60% 40%,#B9A6C9,transparent 70%),radial-gradient(45% 50% at 20% 80%,#F0D9C4,transparent 70%),#CFC6D6",
  },
  {
    id: "ex-3",
    titre: "Canapé trois places en velours, très bon état",
    prixCentimes: 45000,
    ville: "Caluire",
    publieeLe: "il y a 3 jours",
    statut: "reserve",
    remise: ["livraison"],
    visuel:
      "radial-gradient(60% 60% at 70% 30%,#E9B7A0,transparent 70%),radial-gradient(50% 55% at 25% 70%,#8C7A6B,transparent 70%),#D8C8BD",
  },
  {
    id: "ex-4",
    titre: "Appareil photo Fujifilm X-T30 avec objectif 18-55",
    prixCentimes: 62000,
    ville: "Lyon 3e",
    publieeLe: "il y a 4 jours",
    statut: "disponible",
    remise: ["main-propre", "livraison"],
    visuel:
      "radial-gradient(50% 55% at 35% 40%,#9FB4C7,transparent 70%),radial-gradient(45% 50% at 80% 75%,#E6D2B5,transparent 70%),#C9CCD1",
  },
];

export function formaterPrix(centimes: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: centimes % 100 === 0 ? 0 : 2,
  }).format(centimes / 100);
}
