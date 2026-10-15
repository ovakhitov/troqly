import "server-only";
import { notFound, redirect } from "next/navigation";
import { creerClientAdmin } from "./supabase/admin";
import { creerClientServeur } from "./supabase/serveur";

// Le tableau de bord lit tout avec la clé secrète (rôles, e-mails, montants Stripe ne sont pas
// lisibles autrement). Chaque page et chaque action commence donc par vérifier, avec la session
// du visiteur, qu'il est administrateur et non bloqué.
export async function exigerAdmin(suivant = "/admin") {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect(`/connexion?suivant=${encodeURIComponent(suivant)}`);
  const { data: estAdmin } = await supabase.rpc("a_le_role", { roles: ["administrateur"] });
  if (estAdmin !== true) notFound();
  return { id, admin: creerClientAdmin() };
}

// Même journal que la modération : chaque action du tableau de bord y laisse une trace
export async function journaliser(
  acteur: string,
  action: string,
  cible: { type: string; id: string },
  details: Record<string, unknown> = {},
) {
  await creerClientAdmin()
    .from("journal_audit")
    .insert({ acteur, action, cible_type: cible.type, cible_id: cible.id, details });
}

// E-mails des comptes de connexion, par identifiant (une page suffit tant que Troqly a moins de 1 000 membres)
export async function emailsDesMembres() {
  const { data } = await creerClientAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  return new Map((data?.users ?? []).map((u) => [u.id, u]));
}

export function lienStripe(chemin: string) {
  const test = !process.env.STRIPE_SECRET_KEY || /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY);
  return `https://dashboard.stripe.com${test ? "/test" : ""}/${chemin}`;
}
