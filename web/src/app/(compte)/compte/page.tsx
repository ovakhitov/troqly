import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { activerPaiements, ouvrirTableauStripe } from "@/app/commandes/actions";
import { CadreCompte } from "@/components/CadreCompte";
import { IconeChevron } from "@/components/Icones";
import { Volet } from "@/components/Volet";
import { stripeConfigure } from "@/lib/stripe";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { libellesGenre, type Genre } from "@/lib/genres";
import { deconnecter } from "../actions";
import { FormulaireInformations } from "./FormulaireInformations";
import { FormulaireProfil } from "./FormulaireProfil";
import { SupprimerCompte } from "./SupprimerCompte";

export const metadata: Metadata = { title: "Mon compte" };

const libellesRole = {
  utilisateur: "Membre",
  moderateur: "Modérateur",
  administrateur: "Administrateur",
} as const;

// Accueil du compte : les raccourcis d'abord, les réglages repliés en dessous
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
    supabase.from("profils").select("pseudo, ville, boutique_nom").eq("id", claims.sub).single(),
    supabase
      .from("informations_privees")
      .select("prenom, nom, genre, date_naissance, telephone")
      .eq("id", claims.sub)
      .maybeSingle(),
    supabase.rpc("mon_role"),
    supabase.from("comptes_paiement").select("versements_actifs, infos_completes").eq("membre", claims.sub).maybeSingle(),
  ]);

  const majorite = new Date();
  majorite.setUTCFullYear(majorite.getUTCFullYear() - 18);
  const informationsCompletes = Boolean(prive?.genre);
  const moderation = role === "moderateur" || role === "administrateur";

  const raccourcis = [
    {
      href: "/compte/boutique",
      libelle: "Ma boutique",
      detail: profil?.boutique_nom ?? "À nommer avant de vendre",
      aFaire: !profil?.boutique_nom,
    },
    { href: "/commandes", libelle: "Achats et ventes" },
    { href: "/offres", libelle: "Négociations" },
    { href: "/messages", libelle: "Messages" },
    { href: "/compte/favoris", libelle: "Mes favoris" },
    ...(moderation ? [{ href: "/moderation", libelle: "Modération" }] : []),
  ];

  return (
    <CadreCompte titre={profil?.pseudo ?? "Mon compte"} intro={typeof claims.email === "string" ? claims.email : undefined}>
      {(!informationsCompletes || !profil?.boutique_nom) && (
        <p role="status" className="rounded-champ border border-abricot px-4 py-3 text-sm text-prune-nuit">
          {informationsCompletes
            ? "Pour vendre, nommez votre boutique."
            : profil?.boutique_nom
              ? "Pour vendre et acheter, complétez vos informations personnelles."
              : "Pour vendre et acheter, complétez vos informations personnelles et nommez votre boutique."}
        </p>
      )}

      <nav aria-label="Mon espace" className="-mx-2">
        <ul className="grid">
          {raccourcis.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex min-h-13 items-center justify-between gap-4 rounded-champ px-2 py-2.5 transition-colors duration-150 hover:bg-creux"
              >
                <span className="grid min-w-0">
                  <span className="font-semibold text-prune-nuit">{r.libelle}</span>
                  {r.detail && (
                    <span className={`truncate text-sm ${r.aFaire ? "font-semibold text-abricot" : "text-mauve"}`}>{r.detail}</span>
                  )}
                </span>
                <IconeChevron className="size-4 shrink-0 text-mauve" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid border-t border-ligne">
        <Volet titre="Profil public" resume={[profil?.pseudo, profil?.ville].filter(Boolean).join(" · ")}>
          <FormulaireProfil pseudo={profil?.pseudo ?? ""} ville={profil?.ville ?? ""} />
        </Volet>

        <Volet
          titre="Informations personnelles"
          resume={
            informationsCompletes && prive
              ? `${prive.prenom} ${prive.nom} · ${libellesGenre[prive.genre as Genre]}`
              : "À compléter avant de vendre ou d'acheter"
          }
          ouvert={!informationsCompletes || informations === "ok"}
        >
          <p className="text-sm text-mauve">Visibles uniquement par vous, jamais affichées sur vos annonces.</p>
          <FormulaireInformations
            key={prive ? "modification" : "premiere-saisie"}
            prenom={prive?.prenom ?? ""}
            nom={prive?.nom ?? ""}
            genre={prive?.genre ?? ""}
            telephone={prive?.telephone ? `0${prive.telephone.slice(3)}` : ""}
            dateNaissance={prive?.date_naissance ?? null}
            naissanceMax={majorite.toISOString().slice(0, 10)}
            succesInitial={informations === "ok" && prive ? "Informations enregistrées." : undefined}
          />
        </Volet>

        {stripeConfigure() && (
          <Volet
            titre="Recevoir des paiements"
            resume={
              comptePaiement?.versements_actifs ? "Activés" : comptePaiement ? "Activation en cours" : "Pas encore activés"
            }
            ouvert={paiements === "infos"}
          >
            {paiements === "infos" && (
              <p role="alert" className="text-sm text-prune-nuit">
                Complétez d&apos;abord vos informations personnelles et nommez votre boutique.
              </p>
            )}
            {comptePaiement?.versements_actifs ? (
              <>
                <p className="text-sm text-mauve">
                  Les acheteurs peuvent payer vos objets en ligne, et le prix vous est versé sur votre compte bancaire après la
                  remise.
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
                    ? "Stripe a besoin d'informations supplémentaires ou est en train de les vérifier."
                    : "Pour vendre avec paiement en ligne, enregistrez votre identité et votre IBAN auprès de Stripe, notre prestataire de paiement. Troqly ne voit jamais ces informations."}
                </p>
                <form action={activerPaiements}>
                  <button type="submit" className="bouton text-sm">
                    {comptePaiement ? "Terminer l'activation" : "Activer les paiements"}
                  </button>
                </form>
              </>
            )}
          </Volet>
        )}

        <Volet titre="Sécurité" resume="Mot de passe, suppression du compte">
          <Link href="/compte/mot-de-passe" className="text-sm font-semibold text-prune hover:underline">
            Changer mon mot de passe
          </Link>
          <SupprimerCompte />
        </Volet>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ligne pt-5">
        <span className="rounded-[10px] border border-ligne px-3 py-1 text-xs font-semibold text-prune-nuit">
          {libellesRole[(role ?? "utilisateur") as keyof typeof libellesRole] ?? "Membre"}
        </span>
        <form action={deconnecter}>
          <button type="submit" className="min-h-11 text-sm font-semibold text-prune hover:underline">
            Se déconnecter
          </button>
        </form>
      </div>
    </CadreCompte>
  );
}
