import { NextResponse, type NextRequest } from "next/server";
import { etatCompteVendeur, lienActivation } from "@/lib/stripe-connect";
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

  // Lien expiré ou déjà utilisé : on en génère un nouveau pour le même compte
  if (request.nextUrl.searchParams.get("relancer")) {
    return NextResponse.redirect(await lienActivation(ligne.stripe_compte, request.nextUrl.origin));
  }

  const etat = await etatCompteVendeur(ligne.stripe_compte);
  await admin
    .from("comptes_paiement")
    .update({ versements_actifs: etat.actif, infos_completes: etat.infosCompletes })
    .eq("membre", id);

  destination.pathname = "/compte";
  destination.searchParams.set("paiements", etat.actif ? "actifs" : "en-cours");
  return NextResponse.redirect(destination);
}
