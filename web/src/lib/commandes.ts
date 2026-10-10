export type StatutCommande = "en_attente" | "payee" | "terminee" | "annulee" | "remboursee" | "litige";

export const libellesCommande: Record<StatutCommande, string> = {
  en_attente: "Paiement en attente",
  payee: "Payée, remise à faire",
  terminee: "Terminée",
  annulee: "Annulée",
  remboursee: "Remboursée",
  litige: "Litige en cours",
};
