import "server-only";
import { FORMULES, type FormuleBoost, type StatutBoost } from "./boosts";
import { stripe } from "./stripe";
import { creerClientAdmin } from "./supabase/admin";

const MS_JOUR = 86_400_000;

type Achat = {
  id: string;
  annonce: string | null;
  formule: FormuleBoost;
  prix_centimes: number;
  statut: StatutBoost;
  fin: string | null;
  stripe_session: string | null;
  stripe_paiement: string | null;
};

const COLONNES = "id, annonce, formule, prix_centimes, statut, fin, stripe_session, stripe_paiement";

// Raison pour laquelle une annonce ne peut pas recevoir ce boost maintenant (null : possible)
export async function boostImpossible(idAnnonce: string, formule: FormuleBoost, sauf?: string) {
  const admin = creerClientAdmin();
  const { data: a } = await admin.from("annonces").select("statut, moderation, boost_jusqua").eq("id", idAnnonce).maybeSingle();
  if (!a || a.moderation !== "visible" || a.statut !== "publiee") return "indisponible";
  if (formule === "remontee") return null;
  if (formule === "une_7j" && a.boost_jusqua && Date.parse(a.boost_jusqua) > Date.now()) return "deja";
  let requete = admin.from("achats_boost").select("id").eq("annonce", idAnnonce).eq("formule", formule).eq("statut", "actif");
  if (sauf) requete = requete.neq("id", sauf);
  const { data: actif } = await requete.limit(1);
  return actif?.length ? "deja" : null;
}

// Enregistre le paiement d'un boost à partir de sa session Stripe, relue chez Stripe :
// le retour du navigateur ne vaut jamais preuve de paiement. Appelé par les notifications Stripe
// et, en secours, au retour du paiement ; le premier arrivé active le boost, le second ne fait rien.
export async function enregistrerPaiementBoost(idAchat: string, idSession: string) {
  const session = await stripe().checkout.sessions.retrieve(idSession, { expand: ["payment_intent"] });
  if (session.metadata?.boost !== idAchat || session.payment_status !== "paid") return false;
  const paiement = session.payment_intent;
  if (!paiement || typeof paiement === "string") return false;
  const charge = typeof paiement.latest_charge === "string" ? paiement.latest_charge : paiement.latest_charge?.id;

  const admin = creerClientAdmin();
  const { data: achat } = await admin.from("achats_boost").select(COLONNES).eq("id", idAchat).maybeSingle<Achat>();
  if (!achat || achat.statut !== "en_attente") return false;
  if (session.amount_total !== achat.prix_centimes) return false;

  const maintenant = new Date();
  const formule = FORMULES[achat.formule];
  const fin = new Date(maintenant.getTime() + formule.jours * MS_JOUR).toISOString();
  const debut = maintenant.toISOString();

  // Seul l'appel qui fait passer l'achat de « en attente » à « actif » applique le boost
  const { data: pris, error } = await admin
    .from("achats_boost")
    .update({
      statut: "actif",
      payee_le: debut,
      debut,
      fin,
      stripe_paiement: paiement.id,
      stripe_charge: charge,
    })
    .eq("id", idAchat)
    .eq("statut", "en_attente")
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") return false;
  if (!pris && !error) return false;
  // 23505 : un boost de la même formule vient d'être activé sur l'annonce par un autre paiement
  const empechement = error
    ? "deja"
    : achat.annonce
      ? await boostImpossible(achat.annonce, achat.formule, idAchat)
      : "indisponible";

  // Annonce vendue, retirée ou déjà promue entre-temps : remboursement immédiat, rien n'est appliqué
  if (empechement) {
    await stripe().refunds.create({ payment_intent: paiement.id }, { idempotencyKey: `boost-refus-${idAchat}` });
    await admin
      .from("achats_boost")
      .update({
        statut: "rembourse",
        stripe_paiement: paiement.id,
        stripe_charge: charge,
        motif_fin: empechement === "deja" ? "Boost déjà en cours sur l'annonce" : "Annonce plus disponible au moment du paiement",
        termine_le: debut,
      })
      .eq("id", idAchat)
      .in("statut", ["en_attente", "actif"]);
    return false;
  }

  const idAnnonce = achat.annonce!;
  if (achat.formule === "une_7j") {
    await admin.from("annonces").update({ boost_jusqua: fin }).eq("id", idAnnonce);
  } else {
    await admin.from("annonces").update({ remontee_le: debut }).eq("id", idAnnonce);
    await admin
      .from("achats_boost")
      .update(
        achat.formule === "remontee"
          ? { statut: "termine", remontees_faites: 1, derniere_remontee: debut, termine_le: debut }
          : { remontees_faites: 1, derniere_remontee: debut },
      )
      .eq("id", idAchat);
  }
  return true;
}

// Arrête un boost en cours (remboursement, contestation, décision de l'équipe) : effet immédiat
export async function arreterBoost(idAchat: string, statut: "rembourse" | "interrompu", motif: string) {
  const admin = creerClientAdmin();
  const { data: achat } = await admin
    .from("achats_boost")
    .update({ statut, motif_fin: motif.slice(0, 300), termine_le: new Date().toISOString() })
    .eq("id", idAchat)
    .in("statut", ["actif", "termine"])
    .select(COLONNES)
    .maybeSingle<Achat>();
  // « À la une » : l'annonce quitte la mise en avant, sauf si quelqu'un l'a prolongée depuis
  if (achat?.formule === "une_7j" && achat.annonce && achat.fin) {
    const { data: a } = await admin.from("annonces").select("boost_jusqua").eq("id", achat.annonce).maybeSingle();
    if (a?.boost_jusqua && Date.parse(a.boost_jusqua) === Date.parse(achat.fin)) {
      await admin.from("annonces").update({ boost_jusqua: null }).eq("id", achat.annonce);
    }
  }
  return Boolean(achat);
}

// Remboursement intégral d'un boost par l'équipe Troqly
export async function rembourserBoost(idAchat: string, motif: string) {
  const admin = creerClientAdmin();
  const { data: achat } = await admin.from("achats_boost").select(COLONNES).eq("id", idAchat).maybeSingle<Achat>();
  if (!achat?.stripe_paiement || !["actif", "termine", "interrompu"].includes(achat.statut)) return false;
  await stripe().refunds.create({ payment_intent: achat.stripe_paiement }, { idempotencyKey: `boost-remboursement-${idAchat}` });
  if (achat.statut === "interrompu") {
    await admin.from("achats_boost").update({ statut: "rembourse", motif_fin: motif.slice(0, 300) }).eq("id", idAchat);
    return true;
  }
  return arreterBoost(idAchat, "rembourse", motif);
}
