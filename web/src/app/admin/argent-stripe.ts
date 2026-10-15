import "server-only";
import { stripe, stripeConfigure } from "@/lib/stripe";

// Solde du compte Stripe principal de Troqly (là où restent les commissions)
export async function soldeStripe() {
  if (!stripeConfigure()) return null;
  try {
    const solde = await stripe().balance.retrieve();
    const somme = (lignes: { amount: number; currency: string }[]) =>
      lignes.filter((l) => l.currency === "eur").reduce((t, l) => t + l.amount, 0);
    return { disponible: somme(solde.available), aVenir: somme(solde.pending) };
  } catch {
    return null;
  }
}
