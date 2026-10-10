import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Retour du parcours d'activation Stripe : on relit l'état du compte sans attendre la notification
export async function GET(request: NextRequest) {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  const destination = request.nextUrl.clone();
  destination.search = "";

  if (!id) {
    destination.pathname = "/connexion";
    destination.searchParams.set("suivant", "/compte");
    return NextResponse.redirect(destination);
  }

  const admin = creerClientAdmin();
  const { data: ligne } = await admin.from("comptes_paiement").select("stripe_compte").eq("membre", id).maybeSingle();
  if (!ligne) {
    destination.pathname = "/compte";
    return NextResponse.redirect(destination);
  }

  // Lien expiré : on en génère un nouveau
  if (request.nextUrl.searchParams.get("relancer")) {
    const base = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const lien = await stripe().accountLinks.create({
      account: ligne.stripe_compte,
      type: "account_onboarding",
      refresh_url: `${base}/compte/paiements/retour?relancer=1`,
      return_url: `${base}/compte/paiements/retour`,
    });
    return NextResponse.redirect(lien.url);
  }

  const compte = await stripe().accounts.retrieve(ligne.stripe_compte);
  const actif = compte.payouts_enabled === true && compte.capabilities?.transfers === "active";
  await admin
    .from("comptes_paiement")
    .update({ versements_actifs: actif, infos_completes: compte.details_submitted === true })
    .eq("membre", id);

  destination.pathname = "/compte";
  destination.searchParams.set("paiements", actif ? "actifs" : "en-cours");
  return NextResponse.redirect(destination);
}
