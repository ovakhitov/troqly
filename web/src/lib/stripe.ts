import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigure() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Clé secrète lue uniquement côté serveur ; refuse une clé de production tant que Troqly est en test
export function stripe() {
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) throw new Error("Stripe n'est pas configuré : renseignez STRIPE_SECRET_KEY dans web/.env.local.");
  if (!/^(sk|rk)_test_/.test(cle) && process.env.TROQLY_PAIEMENTS_REELS !== "oui") {
    throw new Error("Seules les clés Stripe de test sont acceptées pour l'instant.");
  }
  client ??= new Stripe(cle, { appInfo: { name: "Troqly" } });
  return client;
}
