import "server-only";
import { montantVendeur } from "./frais";
import { stripe } from "./stripe";
import { creerClientAdmin } from "./supabase/admin";

// Fin de la commande : virement de sa part au vendeur. Les frais de service Troqly restent sur le compte Stripe.
// Hors du fichier des actions serveur pour ne jamais être appelable directement depuis un navigateur.
export async function verserAuVendeur(idCommande: string) {
  const admin = creerClientAdmin();
  const { data: c } = await admin
    .from("commandes")
    .select("id, annonce, vendeur, total_centimes, frais_service_centimes, statut, stripe_charge")
    .eq("id", idCommande)
    .single();
  if (!c || c.statut !== "payee" || !c.stripe_charge || !c.vendeur) return false;

  const { data: compte } = await admin.from("comptes_paiement").select("stripe_compte").eq("membre", c.vendeur).single();
  if (!compte) return false;

  // Le vendeur reçoit le prix de l'article et la livraison en entier : seuls les frais de service
  // restent à Troqly, qui y prend les frais de carte Stripe (pas de commission vendeur)
  const montant = montantVendeur(c.total_centimes, c.frais_service_centimes);

  const virement = await stripe().transfers.create(
    {
      amount: montant,
      currency: "eur",
      destination: compte.stripe_compte,
      source_transaction: c.stripe_charge,
      transfer_group: c.id,
    },
    { idempotencyKey: `virement-${c.id}` },
  );

  await admin
    .from("commandes")
    .update({ statut: "terminee", stripe_virement: virement.id, terminee_le: new Date().toISOString() })
    .eq("id", c.id)
    .eq("statut", "payee");
  if (c.annonce) await admin.from("annonces").update({ statut: "vendue" }).eq("id", c.annonce);
  return true;
}
