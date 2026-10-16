"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { estFormule, FORMULES } from "@/lib/boosts";
import { boostImpossible, enregistrerPaiementBoost } from "@/lib/boosts-serveur";
import { stripe } from "@/lib/stripe";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";

async function origine() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
}

// Le vendeur achète un boost pour sa propre annonce : tout est vérifié ici, côté serveur,
// et le prix vient du barème de lib/boosts.ts, jamais du formulaire
export async function acheterBoost(idAnnonce: string, formData: FormData) {
  const page = `/annonces/${idAnnonce}/booster`;
  const erreur: (code: string) => never = (code) => redirect(`${page}?erreur=${code}`);

  const supabase = await creerClientServeur();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : undefined;
  if (!id) redirect(`/connexion?suivant=${encodeURIComponent(page)}`);

  const formule = formData.get("formule");
  if (!estFormule(formule)) erreur("formule");

  const { data: peutPublier } = await supabase.rpc("peut_publier");
  if (!peutPublier) erreur("compte");

  const { data: annonce } = await supabase.from("annonces").select("id, vendeur, titre").eq("id", idAnnonce).maybeSingle();
  if (!annonce || annonce.vendeur !== id) erreur("indisponible");

  const empechement = await boostImpossible(idAnnonce, formule);
  if (empechement) erreur(empechement);

  const admin = creerClientAdmin();

  // Paiement déjà ouvert pour cette formule : on y renvoie au lieu d'en créer un second
  const { data: ouvert } = await admin
    .from("achats_boost")
    .select("id, stripe_session")
    .eq("annonce", idAnnonce)
    .eq("formule", formule)
    .eq("statut", "en_attente")
    .maybeSingle();
  if (ouvert) {
    const session = ouvert.stripe_session ? await stripe().checkout.sessions.retrieve(ouvert.stripe_session) : null;
    if (session?.status === "open" && session.url) redirect(session.url);
    if (session?.status === "complete") {
      await enregistrerPaiementBoost(ouvert.id, session.id);
      redirect(`${page}?achat=${ouvert.id}`);
    }
    // Paiement expiré ou jamais créé : il est abandonné, un nouveau peut commencer
    await admin.from("achats_boost").update({ statut: "annule" }).eq("id", ouvert.id).eq("statut", "en_attente");
  }

  const offre = FORMULES[formule];
  const { data: achat, error } = await admin
    .from("achats_boost")
    .insert({ annonce: idAnnonce, vendeur: id, titre: annonce.titre, formule, prix_centimes: offre.prixCentimes })
    .select("id")
    .single();
  if (error?.code === "23505") erreur("en_cours");
  if (error || !achat) erreur("erreur");

  const base = await origine();
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: email,
      locale: "fr",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: offre.prixCentimes,
            product_data: { name: `${offre.nom} · ${annonce.titre}`, description: `${offre.duree}. Sans renouvellement automatique.` },
          },
        },
      ],
      payment_intent_data: { metadata: { boost: achat.id, annonce: idAnnonce } },
      metadata: { boost: achat.id },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${base}${page}?achat=${achat.id}`,
      cancel_url: `${base}${page}`,
    },
    { idempotencyKey: `boost-${achat.id}` },
  );

  await admin.from("achats_boost").update({ stripe_session: session.id }).eq("id", achat.id);
  redirect(session.url!);
}
