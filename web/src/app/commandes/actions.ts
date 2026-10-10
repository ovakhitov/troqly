"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculerFrais } from "@/lib/frais";
import { stripe } from "@/lib/stripe";
import { lienActivation } from "@/lib/stripe-connect";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { creerClientServeur } from "@/lib/supabase/serveur";

async function origine() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3001";
}

async function membre(suivant: string) {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect(`/connexion?suivant=${encodeURIComponent(suivant)}`);
  return { supabase, id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}

// Vendeurs ---------------------------------------------------------------------

export async function activerPaiements() {
  const { supabase, id, email } = await membre("/compte");
  const { data: peutPublier } = await supabase.rpc("peut_publier");
  if (!peutPublier) redirect("/compte?paiements=infos");

  const admin = creerClientAdmin();
  const { data: existant } = await admin.from("comptes_paiement").select("stripe_compte").eq("membre", id).maybeSingle();

  let compte = existant?.stripe_compte as string | undefined;
  if (!compte) {
    // Compte destinataire (Accounts v2) avec tableau de bord Express :
    // Stripe vérifie l'identité et l'IBAN, Troqly ne les voit jamais
    const cree = await stripe().v2.core.accounts.create(
      {
        contact_email: email,
        dashboard: "express",
        identity: { country: "FR", entity_type: "individual" },
        defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
        metadata: { membre: id },
      },
      { idempotencyKey: `compte-v2-${id}` },
    );
    compte = cree.id;
    await admin.from("comptes_paiement").insert({ membre: id, stripe_compte: compte });
  }

  redirect(await lienActivation(compte, await origine()));
}

export async function ouvrirTableauStripe() {
  const { id } = await membre("/compte");
  const admin = creerClientAdmin();
  const { data } = await admin.from("comptes_paiement").select("stripe_compte").eq("membre", id).maybeSingle();
  if (!data) redirect("/compte");
  const lien = await stripe().accounts.createLoginLink(data.stripe_compte);
  redirect(lien.url);
}

// Acheteurs --------------------------------------------------------------------

export async function acheter(idAnnonce: string, formData: FormData) {
  const { supabase, id, email } = await membre(`/annonces/${idAnnonce}`);
  const retourErreur: (code: string) => never = (code) => redirect(`/annonces/${idAnnonce}?achat=${code}`);

  const { data: peutAcheter } = await supabase.rpc("peut_publier");
  if (!peutAcheter) retourErreur("infos");

  const { data: annonce } = await supabase
    .from("annonces")
    .select("id, vendeur, titre, prix_centimes, statut, moderation, main_propre, livraison")
    .eq("id", idAnnonce)
    .maybeSingle();
  if (!annonce || annonce.moderation !== "visible" || annonce.statut !== "publiee") retourErreur("indisponible");
  if (annonce.vendeur === id) retourErreur("indisponible");

  const mode = formData.get("mode") === "livraison" ? "livraison" : "main_propre";
  if ((mode === "livraison" && !annonce.livraison) || (mode === "main_propre" && !annonce.main_propre)) {
    retourErreur("mode");
  }

  const admin = creerClientAdmin();
  const { data: compteVendeur } = await admin
    .from("comptes_paiement")
    .select("stripe_compte, versements_actifs")
    .eq("membre", annonce.vendeur)
    .maybeSingle();
  if (!compteVendeur?.versements_actifs) retourErreur("vendeur");

  const frais = calculerFrais(annonce.prix_centimes);
  const { data: commande, error } = await admin
    .from("commandes")
    .insert({
      annonce: annonce.id,
      titre: annonce.titre,
      acheteur: id,
      vendeur: annonce.vendeur,
      prix_centimes: frais.prixCentimes,
      frais_service_centimes: frais.fraisServiceCentimes,
      total_centimes: frais.totalCentimes,
      mode_remise: mode,
      code_remise: String(randomInt(0, 1_000_000)).padStart(6, "0"),
    })
    .select("id")
    .single();
  if (error || !commande) retourErreur("erreur");

  const base = await origine();
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: email,
      locale: "fr",
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "eur", unit_amount: frais.prixCentimes, product_data: { name: annonce.titre } },
        },
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: frais.fraisServiceCentimes,
            product_data: { name: "Frais de service Troqly" },
          },
        },
      ],
      payment_intent_data: { transfer_group: commande.id, metadata: { commande: commande.id } },
      metadata: { commande: commande.id },
      // Une commande non payée libère l'annonce au bout de 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: `${base}/commandes/${commande.id}?paiement=ok`,
      cancel_url: `${base}/annonces/${annonce.id}`,
    },
    { idempotencyKey: `paiement-${commande.id}` },
  );

  await admin.from("commandes").update({ stripe_session: session.id }).eq("id", commande.id);
  redirect(session.url!);
}

// Fin de la commande : virement au vendeur -----------------------------------

async function verserAuVendeur(idCommande: string) {
  const admin = creerClientAdmin();
  const { data: c } = await admin
    .from("commandes")
    .select("id, annonce, vendeur, prix_centimes, statut, stripe_charge")
    .eq("id", idCommande)
    .single();
  if (!c || c.statut !== "payee" || !c.stripe_charge || !c.vendeur) return false;

  const { data: compte } = await admin.from("comptes_paiement").select("stripe_compte").eq("membre", c.vendeur).single();
  if (!compte) return false;

  const virement = await stripe().transfers.create(
    {
      amount: c.prix_centimes,
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

// Livraison : l'acheteur confirme avoir reçu l'objet
export async function confirmerReception(idCommande: string) {
  const { supabase, id } = await membre(`/commandes/${idCommande}`);
  const { data: c } = await supabase.from("commandes").select("acheteur, statut").eq("id", idCommande).maybeSingle();
  if (!c || c.acheteur !== id || c.statut !== "payee") redirect(`/commandes/${idCommande}`);

  await verserAuVendeur(idCommande);
  revalidatePath(`/commandes/${idCommande}`);
  redirect(`/commandes/${idCommande}?terminee=1`);
}

export type EtatCode = { erreur?: string };

// Main propre : le vendeur saisit le code que l'acheteur lui donne
export async function validerCode(idCommande: string, _: EtatCode, formData: FormData): Promise<EtatCode> {
  const { supabase, id } = await membre(`/commandes/${idCommande}`);
  const { data: c } = await supabase.from("commandes").select("vendeur, statut").eq("id", idCommande).maybeSingle();
  if (!c || c.vendeur !== id || c.statut !== "payee") return { erreur: "Cette commande ne peut pas être validée." };

  const admin = creerClientAdmin();
  const { data: secret } = await admin.from("commandes").select("code_remise, essais_code").eq("id", idCommande).single();
  if (!secret) return { erreur: "Cette commande ne peut pas être validée." };
  if (secret.essais_code >= 5) {
    return { erreur: "Trop d'essais. Contactez l'équipe Troqly pour débloquer cette commande." };
  }

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (code !== secret.code_remise) {
    await admin.from("commandes").update({ essais_code: secret.essais_code + 1 }).eq("id", idCommande);
    const restants = 4 - secret.essais_code;
    return { erreur: `Code incorrect. ${restants > 0 ? `Il reste ${restants} essai${restants > 1 ? "s" : ""}.` : "Plus aucun essai."}` };
  }

  await verserAuVendeur(idCommande);
  revalidatePath(`/commandes/${idCommande}`);
  redirect(`/commandes/${idCommande}?terminee=1`);
}

// Le vendeur ne peut pas honorer la vente : remboursement complet de l'acheteur
export async function annulerEtRembourser(idCommande: string) {
  const { supabase, id } = await membre(`/commandes/${idCommande}`);
  const { data: c } = await supabase
    .from("commandes")
    .select("vendeur, statut")
    .eq("id", idCommande)
    .maybeSingle();
  const { data: role } = await supabase.rpc("mon_role");
  const autorise = c && (c.vendeur === id || role === "moderateur" || role === "administrateur");
  if (!autorise || c.statut !== "payee") redirect(`/commandes/${idCommande}`);

  const admin = creerClientAdmin();
  const { data: s } = await admin.from("commandes").select("annonce, stripe_paiement").eq("id", idCommande).single();
  if (s?.stripe_paiement) {
    await stripe().refunds.create({ payment_intent: s.stripe_paiement }, { idempotencyKey: `remboursement-${idCommande}` });
  }
  await admin.from("commandes").update({ statut: "remboursee" }).eq("id", idCommande).eq("statut", "payee");
  if (s?.annonce) await admin.from("annonces").update({ statut: "publiee" }).eq("id", s.annonce).eq("statut", "reservee");

  revalidatePath(`/commandes/${idCommande}`);
  redirect(`/commandes/${idCommande}?remboursee=1`);
}
