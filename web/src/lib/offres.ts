export type Offre = {
  id: number;
  annonce: string;
  acheteur: string;
  vendeur: string;
  montant_centimes: number;
  contre_centimes: number | null;
  statut: "en_attente" | "contre_proposee" | "acceptee" | "refusee" | "retiree" | "utilisee";
  cree_le: string;
  valable_jusqu_au: string | null;
};

export const COLONNES_OFFRE =
  "id, annonce, acheteur, vendeur, montant_centimes, contre_centimes, statut, cree_le, valable_jusqu_au";

// Prix convenu : la contre-proposition acceptée, sinon l'offre de l'acheteur
export function prixConvenu(o: Offre) {
  return o.contre_centimes ?? o.montant_centimes;
}

export function offreUtilisable(o: Offre, maintenant = Date.now()) {
  return o.statut === "acceptee" && o.valable_jusqu_au !== null && new Date(o.valable_jusqu_au).getTime() > maintenant;
}

export const libellesOffre: Record<Offre["statut"], string> = {
  en_attente: "En attente du vendeur",
  contre_proposee: "Contre-proposition du vendeur",
  acceptee: "Acceptée",
  refusee: "Refusée",
  retiree: "Retirée ou expirée",
  utilisee: "Achat effectué",
};
