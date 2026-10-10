import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { cheminSur } from "@/lib/validation";

// Point d'arrivée des liens envoyés par e-mail (confirmation d'adresse, mot de passe oublié)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const suivant = cheminSur(searchParams.get("suivant"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await creerClientServeur();
  let valide = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    valide = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    valide = !error;
  }

  const destination = request.nextUrl.clone();
  destination.search = "";
  if (valide) {
    destination.pathname = suivant;
  } else {
    destination.pathname = "/connexion";
    destination.searchParams.set("erreur", "lien");
  }
  return NextResponse.redirect(destination);
}
