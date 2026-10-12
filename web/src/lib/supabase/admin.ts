import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnvObligatoire } from "./env";

// Client avec la clé secrète : ignore les règles RLS. Réservé aux opérations
// que le serveur a déjà autorisées (notifications Stripe, commandes, versements).
export function creerClientAdmin() {
  const { url } = supabaseEnvObligatoire();
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!cle) throw new Error("SUPABASE_SECRET_KEY manque dans web/.env.local.");
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
}
