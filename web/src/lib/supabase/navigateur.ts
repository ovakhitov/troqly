import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnvObligatoire } from "./env";

// Client Supabase côté navigateur (envoi des photos directement vers le stockage)
export function creerClientNavigateur() {
  const { url, cle } = supabaseEnvObligatoire();
  return createBrowserClient(url, cle);
}
