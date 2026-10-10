import "server-only";
import { stripe } from "./stripe";
import { creerClientAdmin } from "./supabase/admin";

// Enregistre le paiement d'une commande à partir de sa session Stripe.
// Utilisé par les notifications Stripe (webhooks) et, en secours, au retour du paiement :
// le résultat est le même quel que soit le premier arrivé.
export async function enregistrerPaiement(idCommande: string, idSession: string) {
  const session = await stripe().checkout.sessions.retrieve(idSession, { expand: ["payment_intent"] });
  if (session.metadata?.commande !== idCommande || session.payment_status !== "paid") return false;

  const paiement = session.payment_intent;
  if (!paiement || typeof paiement === "string") return false;
  const charge = typeof paiement.latest_charge === "string" ? paiement.latest_charge : paiement.latest_charge?.id;

  const admin = creerClientAdmin();
  const { data: maj, error } = await admin
    .from("commandes")
    .update({ statut: "payee", payee_le: new Date().toISOString(), stripe_paiement: paiement.id, stripe_charge: charge })
    .eq("id", idCommande)
    .eq("statut", "en_attente")
    .select("annonce")
    .maybeSingle();

  if (error?.code === "23505") {
    // Un autre acheteur a payé la même annonce juste avant : remboursement immédiat
    await stripe().refunds.create({ payment_intent: paiement.id }, { idempotencyKey: `doublon-${idCommande}` });
    await admin.from("commandes").update({ statut: "remboursee", stripe_paiement: paiement.id }).eq("id", idCommande);
    return false;
  }
  if (maj?.annonce) {
    await admin.from("annonces").update({ statut: "reservee" }).eq("id", maj.annonce).eq("statut", "publiee");
  }
  return true;
}
