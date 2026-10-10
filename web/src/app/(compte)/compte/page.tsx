import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { deconnecter } from "../actions";
import { FormulaireProfil } from "./FormulaireProfil";

export const metadata: Metadata = { title: "Mon compte | Troqly" };

const libellesRole = {
  utilisateur: "Membre",
  moderateur: "Modérateur",
  administrateur: "Administrateur",
} as const;

export default async function PageCompte() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/connexion?suivant=/compte");

  const [{ data: profil }, { data: prive }, { data: role }] = await Promise.all([
    supabase.from("profils").select("pseudo, ville").eq("id", claims.sub).single(),
    supabase.from("informations_privees").select("prenom, nom, date_naissance, telephone").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("mon_role"),
  ]);

  return (
    <CadreCompte titre="Mon compte" intro={typeof claims.email === "string" ? claims.email : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-ligne px-3 py-1 text-xs font-semibold text-prune-nuit">
          {libellesRole[(role ?? "utilisateur") as keyof typeof libellesRole] ?? "Membre"}
        </span>
        <form action={deconnecter}>
          <button type="submit" className="text-sm font-semibold text-prune hover:underline">
            Se déconnecter
          </button>
        </form>
      </div>

      <FormulaireProfil
        valeurs={{
          pseudo: profil?.pseudo ?? "",
          ville: profil?.ville ?? "",
          prenom: prive?.prenom ?? "",
          nom: prive?.nom ?? "",
          telephone: prive?.telephone ? `0${prive.telephone.slice(3)}` : "",
        }}
        dateNaissance={prive?.date_naissance ?? null}
      />

      <Link href="/compte/mot-de-passe" className="text-sm font-semibold text-prune hover:underline">
        Changer mon mot de passe
      </Link>
    </CadreCompte>
  );
}
