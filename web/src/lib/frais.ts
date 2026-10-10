// Frais de service payés par l'acheteur : ils couvrent la commission Troqly
// et les frais de carte Stripe, pour que le vendeur touche le prix affiché.
// Les frais Connect par vendeur ne sont pas encore couverts (décision en attente).

const COMMISSION_BPS = Number(process.env.TROQLY_COMMISSION_BPS ?? 125); // 1,25 %
const CARTE_POURCENT = 0.015; // carte européenne standard (estimation, à confirmer)
const CARTE_FIXE_CENTIMES = 25;

export function calculerFrais(prixCentimes: number) {
  const commission = Math.ceil((prixCentimes * COMMISSION_BPS) / 10_000);
  // total - (1,5 % du total + 0,25 €) = prix + commission
  const total = Math.ceil((prixCentimes + commission + CARTE_FIXE_CENTIMES) / (1 - CARTE_POURCENT));
  return {
    prixCentimes,
    commissionCentimes: commission,
    fraisServiceCentimes: total - prixCentimes,
    totalCentimes: total,
  };
}
