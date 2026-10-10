import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PAGES_PROTEGEES = ["/compte"];

// Rafraîchit la session à chaque requête et protège les pages réservées aux membres
export async function mettreAJourSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.cle, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(aEcrire) {
        aEcrire.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        aEcrire.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims vérifie la signature du jeton ; ne rien intercaler avant cet appel
  const { data } = await supabase.auth.getClaims();
  const connecte = Boolean(data?.claims);

  const chemin = request.nextUrl.pathname;
  if (!connecte && PAGES_PROTEGEES.some((p) => chemin === p || chemin.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suivant=${encodeURIComponent(chemin)}`;
    return NextResponse.redirect(url);
  }

  return response;
}
