// Les variables NEXT_PUBLIC_* doivent être lues littéralement pour être intégrées au build.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return null;
  return { url, cle };
}

export function supabaseEnvObligatoire() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase n'est pas configuré : renseignez web/.env.local (voir web/.env.example).",
    );
  }
  return env;
}
