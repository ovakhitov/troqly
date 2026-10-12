import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnvObligatoire } from "./env";

// Client Supabase pour les composants serveur, actions serveur et routes
export async function creerClientServeur() {
  // cookies() d'abord : la page est ainsi toujours rendue à la demande, jamais à la construction
  const cookieStore = await cookies();
  const { url, cle } = supabaseEnvObligatoire();

  return createServerClient(url, cle, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(aEcrire) {
        try {
          aEcrire.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un composant serveur : le middleware se charge du rafraîchissement.
        }
      },
    },
  });
}
