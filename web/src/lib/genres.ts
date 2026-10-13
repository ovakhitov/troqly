// Sans dépendance : importé aussi par les formulaires du navigateur
export const GENRES = ["femme", "homme", "autre"] as const;
export type Genre = (typeof GENRES)[number];
export const libellesGenre: Record<Genre, string> = { femme: "Femme", homme: "Homme", autre: "Autre" };
