// Frais de service payés par l'acheteur : la commission Troqly, et rien d'autre.
// Les frais de carte réels de Stripe sont déduits du montant versé au vendeur
// (décision du 10/10/2026) : Troqly garde ainsi exactement sa commission.
// Les frais Connect par vendeur ne sont pas encore couverts (décision en attente).

export const COMMISSION_BPS = Number(process.env.TROQLY_COMMISSION_BPS ?? 125); // 1,25 %

export function calculerFrais(prixCentimes: number) {
  const commission = Math.ceil((prixCentimes * COMMISSION_BPS) / 10_000);
  return {
    prixCentimes,
    commissionCentimes: commission,
    fraisServiceCentimes: commission,
    totalCentimes: prixCentimes + commission,
  };
}

// Montant versé au vendeur : total payé - frais de carte Stripe - commission Troqly
export function montantVendeur(totalCentimes: number, fraisServiceCentimes: number, fraisStripeCentimes: number) {
  return Math.max(0, totalCentimes - fraisServiceCentimes - fraisStripeCentimes);
}
