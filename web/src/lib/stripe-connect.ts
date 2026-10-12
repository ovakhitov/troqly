import "server-only";
import { stripe } from "./stripe";

// Fonctions internes au serveur (hors fichier « use server » pour ne pas devenir des actions appelables)

export async function lienActivation(compte: string, base: string) {
  const lien = await stripe().v2.core.accountLinks.create({
    account: compte,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${base}/compte/paiements/retour?relancer=1`,
        return_url: `${base}/compte/paiements/retour`,
      },
    },
  });
  return lien.url;
}

// Le vendeur peut recevoir des virements, et ses versements bancaires ne sont pas bloqués
export async function etatCompteVendeur(compte: string) {
  const a = await stripe().v2.core.accounts.retrieve(compte, { include: ["configuration.recipient", "requirements"] });
  const solde = a.configuration?.recipient?.capabilities?.stripe_balance;
  const virements = solde?.stripe_transfers?.status === "active";
  const versements = !solde?.payouts || solde.payouts.status === "active";
  const aFournir = (a.requirements?.entries ?? []).some(
    (e) => e.minimum_deadline?.status === "currently_due" || e.minimum_deadline?.status === "past_due",
  );
  return { actif: virements && versements, infosCompletes: !aFournir };
}
