// Barème unique de Troqly : tous les montants (affichage, base de données, Stripe) en sont tirés.
// Fichier sans dépendance serveur : les composants de navigateur importent les fonctions de calcul,
// mais reçoivent toujours le barème du serveur en propriété (les variables d'environnement
// ne sont lues qu'ici, côté serveur).
//
// Frais de service Troqly (décision du 16/10/2026, tarif de lancement à tester) :
// 4,9 % du prix de l'article + 0,30 €, payés par l'acheteur, calculés sur le prix de l'article seul
// (jamais sur la livraison). Pas de commission vendeur : le vendeur reçoit le prix de l'article
// et le prix de la livraison en entier. Les frais de carte Stripe et les frais Connect sont pris
// sur les frais de service, dans le solde Stripe de Troqly.
// Une vente en main propre payée hors du site ne passe pas par Troqly : aucuns frais.

export type Bareme = {
  // Part proportionnelle en points de base : 490 = 4,9 %
  bps: number;
  // Part fixe en centimes : 30 = 0,30 €
  fixeCentimes: number;
};

function entier(valeur: string | undefined, defaut: number) {
  const n = Number(valeur);
  return Number.isInteger(n) && n >= 0 ? n : defaut;
}

// Réglable sans toucher au code (variables Vercel), sinon 4,9 % + 0,30 €
export const BAREME: Bareme = {
  bps: entier(process.env.TROQLY_FRAIS_SERVICE_BPS, 490),
  fixeCentimes: entier(process.env.TROQLY_FRAIS_SERVICE_FIXE_CENTIMES, 30),
};

// Arrondi au centime le plus proche (0,5 centime et plus : au centime supérieur), en nombres entiers
export function fraisDeService(prixCentimes: number, bareme: Bareme = BAREME) {
  return Math.floor((prixCentimes * bareme.bps + 5_000) / 10_000) + bareme.fixeCentimes;
}

export function calculerFrais(prixCentimes: number, livraisonCentimes = 0, bareme: Bareme = BAREME) {
  const fraisServiceCentimes = fraisDeService(prixCentimes, bareme);
  return {
    prixCentimes,
    fraisServiceCentimes,
    livraisonCentimes,
    totalCentimes: prixCentimes + fraisServiceCentimes + livraisonCentimes,
  };
}

// Montant versé au vendeur : tout ce que l'acheteur a payé, sauf les frais de service Troqly
// (soit le prix de l'article et la livraison, qu'il paie lui-même au transporteur)
export function montantVendeur(totalCentimes: number, fraisServiceCentimes: number) {
  return Math.max(0, totalCentimes - fraisServiceCentimes);
}

// « 4,9 % + 0,30 € »
export function libelleBareme(bareme: Bareme = BAREME) {
  const taux = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(bareme.bps / 100);
  const fixe = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(bareme.fixeCentimes / 100);
  return bareme.fixeCentimes ? `${taux} % + ${fixe}` : `${taux} %`;
}

export const EXPLICATION_FRAIS =
  "Les frais de service Troqly financent le paiement en ligne et le fonctionnement du site. Ils sont calculés sur le prix de l'article, hors livraison.";
