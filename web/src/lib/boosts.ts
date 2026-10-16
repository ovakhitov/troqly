// Boosts payants : achats ponctuels, sans renouvellement automatique. Les annonces ordinaires restent gratuites.
// Seul endroit où figurent les prix et les durées : la page de choix, le paiement Stripe et l'administration les lisent ici.

export type FormuleBoost = "remontee" | "visibilite_7j" | "une_7j";
export type StatutBoost = "en_attente" | "actif" | "termine" | "interrompu" | "rembourse" | "annule";

export const FORMULES: Record<
  FormuleBoost,
  { nom: string; prixCentimes: number; jours: number; duree: string; description: string }
> = {
  remontee: {
    nom: "Remontée immédiate",
    prixCentimes: 99,
    jours: 0,
    duree: "Une fois, tout de suite",
    description: "Votre annonce repasse en tête des annonces les plus récentes, une seule fois.",
  },
  visibilite_7j: {
    nom: "Visibilité 7 jours",
    prixCentimes: 249,
    jours: 7,
    duree: "7 jours, une remontée par jour",
    description: "Votre annonce repasse en tête des annonces les plus récentes une fois par jour pendant 7 jours.",
  },
  une_7j: {
    nom: "À la une 7 jours",
    prixCentimes: 499,
    jours: 7,
    duree: "7 jours",
    description:
      "Votre annonce est placée dans les annonces mises en avant de l'accueil et en tête de la recherche, avec la mention « Sponsorisé ».",
  },
};

export const ORDRE_FORMULES: FormuleBoost[] = ["remontee", "visibilite_7j", "une_7j"];

export function estFormule(v: unknown): v is FormuleBoost {
  return typeof v === "string" && v in FORMULES;
}

export const libellesStatutBoost: Record<StatutBoost, string> = {
  en_attente: "Paiement en attente",
  actif: "En cours",
  termine: "Terminé",
  interrompu: "Interrompu",
  rembourse: "Remboursé",
  annule: "Paiement abandonné",
};

// Règles affichées avant l'achat : ce que Troqly promet, et ce qu'il ne promet pas
export const REGLES_BOOST = [
  "Paiement unique, sans abonnement ni renouvellement automatique.",
  "Un boost améliore la place de l'annonce ; il ne garantit ni un nombre de vues ni une vente.",
  "Si l'annonce est vendue ou supprimée, le boost s'arrête et la durée restante est perdue.",
  "Si l'annonce est réservée ou masquée par la modération, elle n'est plus mise en avant ; le boost reprend si elle redevient disponible avant la fin prévue, qui ne change pas.",
  "En cas de remboursement, le boost s'arrête aussitôt.",
];
