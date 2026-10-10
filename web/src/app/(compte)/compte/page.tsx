import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { activerPaiements, ouvrirTableauStripe } from "@/app/commandes/actions";
import { CadreCompte } from "@/components/CadreCompte";
import { stripeConfigure } from "@/lib/stripe";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { deconnecter } from "../actions";
import { FormulaireInformations } from "./FormulaireInformations";
import { FormulaireProfil } from "./FormulaireProfil";
import { SupprimerCompte } from "./SupprimerCompte";

export const metadata: Metadata = { title: "Mon compte | Troqly" };

const libellesRole = {
  utilisateur: "Membre",
  moderateur: "Modérateur",
  administrateur: "Administrateur",
} as const;

export default async function PageCompte({
  searchParams,
}: {
  searchParams: Promise<{ informations?: string; paiements?: string }>;
}) {
  const { informations, paiements } = await searchParams;
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/connexion?suivant=/compte");

  const [{ data: profil }, { data: prive }, { data: role }, { data: comptePaiement }] = await Promise.all([
    supabase.from("profils").select("pseudo, ville").eq("id", claims.sub).single(),
    supabase.from("informations_privees").select("prenom, nom, date_naissance, telephone").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("mon_role"),
    supabase.from("comptes_paiement").select("versements_actifs, infos_completes").eq("membre", claims.sub).maybeSingle(),
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

      {stripeConfigure() && (
        <section className="grid gap-3 border-t border-ligne pt-5">
          <h2 className="font-titre text-lg font-semibold text-prune-nuit">Recevoir des paiements</h2>
          {paiements === "infos" && (
            <p role="alert" className="text-sm text-prune-nuit">Complétez d&apos;abord vos informations personnelles ci-dessus.</p>
          )}
          {comptePaiement?.versements_actifs ? (
            <>
              <p className="text-sm text-mauve">
                Paiements activés : les acheteurs peuvent payer vos objets en ligne, et le prix vous est versé sur votre compte
                bancaire après la remise.
              </p>
              <form action={ouvrirTableauStripe}>
                <button type="submit" className="text-sm font-semibold text-prune hover:underline">
                  Voir mes versements sur Stripe
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-mauve">
                {comptePaiement
                  ? "Activation en cours : Stripe a besoin d'informations supplémentaires ou est en train de les vérifier."
                  : "Pour vendre avec paiement en ligne, enregistrez votre identité et votre IBAN auprès de Stripe, notre prestataire de paiement. Troqly ne voit jamais ces informations."}
              </p>
              <form action={activerPaiements}>
                <button
                  type="submit"
                  className="rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
                >
                  {comptePaiement ? "Terminer l'activation" : "Activer les paiements"}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <nav className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ligne pt-5 text-sm font-semibold" aria-label="Mon espace">
        <Link href="/compte/annonces" className="text-prune hover:underline">
          Mes annonces
        </Link>
        <Link href="/compte/favoris" className="text-prune hover:underline">
          Mes favoris
        </Link>
        <Link href="/commandes" className="text-prune hover:underline">
          Achats et ventes
        </Link>
        <Link href="/messages" className="text-prune hover:underline">
          Messages
        </Link>
        {(role === "moderateur" || role === "administrateur") && (
          <Link href="/moderation" className="text-prune hover:underline">
            Modération
          </Link>
        )}
        <Link href="/compte/mot-de-passe" className="text-prune hover:underline">
          Changer mon mot de passe
        </Link>
      </nav>

      <SupprimerCompte />
    </CadreCompte>
  );
}
