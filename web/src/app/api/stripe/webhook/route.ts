import type Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { enregistrerPaiement } from "@/lib/synchro-stripe";

// Notifications envoyées par Stripe. La signature est vérifiée avant toute action.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ erreur: "configuration" }, { status: 400 });

  let evenement: Stripe.Event;
  try {
    evenement = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ erreur: "signature invalide" }, { status: 400 });
  }

  const admin = creerClientAdmin();

  switch (evenement.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = evenement.data.object;
      const idCommande = session.metadata?.commande;
      if (idCommande) await enregistrerPaiement(idCommande, session.id);
      break;
    }

    case "checkout.session.expired": {
      const idCommande = evenement.data.object.metadata?.commande;
      if (idCommande) await admin.from("commandes").update({ statut: "annulee" }).eq("id", idCommande).eq("statut", "en_attente");
      break;
    }

    case "account.updated": {
      const compte = evenement.data.object;
      await admin
        .from("comptes_paiement")
        .update({
          versements_actifs: compte.payouts_enabled === true && compte.capabilities?.transfers === "active",
          infos_completes: compte.details_submitted === true,
        })
        .eq("stripe_compte", compte.id);
      break;
    }

    case "charge.refunded": {
      const charge = evenement.data.object;
      if (charge.refunded) {
        await admin.from("commandes").update({ statut: "remboursee" }).eq("stripe_charge", charge.id).in("statut", ["payee", "litige"]);
      }
      break;
    }

    case "charge.dispute.created": {
      const litige = evenement.data.object;
      const charge = typeof litige.charge === "string" ? litige.charge : litige.charge.id;
      const { data } = await admin
        .from("commandes")
        .update({ statut: "litige" })
        .eq("stripe_charge", charge)
        .select("id")
        .maybeSingle();
      if (data) {
        await admin.from("journal_audit").insert({
          acteur: null,
          action: "litige_ouvert",
          cible_type: "commande",
          cible_id: data.id,
          details: { motif: litige.reason, montant: litige.amount },
        });
      }
      break;
    }
  }

  return NextResponse.json({ recu: true });
}
