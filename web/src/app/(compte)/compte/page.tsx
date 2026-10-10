import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { deconnecter } from "../actions";
import { FormulaireInformations } from "./FormulaireInformations";
import { FormulaireProfil } from "./FormulaireProfil";

export const metadata: Metadata = { title: "Mon compte | Troqly" };

const libellesRole = {
  utilisateur: "Membre",
  moderateur: "Modérateur",
  administrateur: "Administrateur",
} as const;

export default async function PageCompte({
  searchParams,
}: {
  searchParams: Promise<{ informations?: string }>;
}) {
  const { informations } = await searchParams;
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/connexion?suivant=/compte");

  const [{ data: profil }, { data: prive }, { data: role }] = await Promise.all([
    supabase.from("profils").select("pseudo, ville").eq("id", claims.sub).single(),
    supabase.from("informations_privees").select("prenom, nom, date_naissance, telephone").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("mon_role"),
  ]);

  const majorite = new Date();
  majorite.setUTCFullYear(majorite.getUTCFullYear() - 18);

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

      <section className="grid gap-4">
        <h2 className="font-titre text-lg font-semibold text-prune-nuit">Profil public</h2>
        <FormulaireProfil pseudo={profil?.pseudo ?? ""} ville={profil?.ville ?? ""} />
      </section>

      <section className="grid gap-4 border-t border-ligne pt-5">
        <div className="grid gap-1">
          <h2 className="font-titre text-lg font-semibold text-prune-nuit">Informations personnelles</h2>
          <p className="text-sm text-mauve">
            {prive
              ? "Visibles uniquement par vous, jamais affichées sur vos annonces."
              : "À compléter avant de vendre ou d'acheter. Visibles uniquement par vous, jamais affichées sur vos annonces."}
          </p>
        </div>
        <FormulaireInformations
          key={prive ? "modification" : "premiere-saisie"}
          prenom={prive?.prenom ?? ""}
          nom={prive?.nom ?? ""}
          telephone={prive?.telephone ? `0${prive.telephone.slice(3)}` : ""}
          dateNaissance={prive?.date_naissance ?? null}
          naissanceMax={majorite.toISOString().slice(0, 10)}
          succesInitial={informations === "ok" && prive ? "Informations enregistrées." : undefined}
        />
      </section>

      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ligne pt-5 text-sm font-semibold" aria-label="Mon espace">
        <Link href="/compte/annonces" className="text-prune hover:underline">
          Mes annonces
        </Link>
        <Link href="/compte/mot-de-passe" className="text-prune hover:underline">
          Changer mon mot de passe
        </Link>
      </nav>
    </CadreCompte>
  );
}
