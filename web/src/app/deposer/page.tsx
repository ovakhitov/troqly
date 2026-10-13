import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireAnnonce } from "@/components/FormulaireAnnonce";
import { iaConfiguree } from "@/lib/ia";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { creerAnnonce } from "../annonces/actions";

export const metadata: Metadata = { title: "Déposer une annonce" };

export default async function PageDeposer() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/deposer");

  const [{ data: peutPublier }, { data: categories }, { data: profil }, { data: prive }] = await Promise.all([
    supabase.rpc("peut_publier"),
    supabase.from("categories").select("slug, libelle").order("ordre"),
    supabase.from("profils").select("ville, boutique_nom").eq("id", id).single(),
    supabase.from("informations_privees").select("genre").eq("id", id).maybeSingle(),
  ]);

  if (!peutPublier) {
    // Deux étapes possibles avant la première annonce : les informations privées, puis la boutique
    const etapeInfos = !prive?.genre;
    return (
      <CadreCompte titre="Déposer une annonce">
        <ol className="grid gap-3 text-prune-nuit">
          <li className={etapeInfos ? "font-semibold" : "text-mauve"}>
            {etapeInfos ? "1." : "✓"} Complétez vos informations personnelles. Elles restent privées et ne sont jamais affichées.
          </li>
          <li className={profil?.boutique_nom ? "text-mauve" : etapeInfos ? "" : "font-semibold"}>
            {profil?.boutique_nom ? "✓" : "2."} Nommez votre boutique : vos annonces sont publiées sous ce nom.
          </li>
        </ol>
        <Link
          href={etapeInfos ? "/compte" : "/compte/boutique?suivant=/deposer"}
          className="bouton justify-self-start"
        >
          {etapeInfos ? "Compléter mon compte" : "Nommer ma boutique"}
        </Link>
      </CadreCompte>
    );
  }

  return (
    <CadreCompte titre="Déposer une annonce" intro="Gratuit. L'annonce est visible dès sa publication." large>
      <FormulaireAnnonce
        action={creerAnnonce}
        idUtilisateur={id}
        categories={categories ?? []}
        iaDisponible={iaConfiguree()}
        libelleBouton="Publier l'annonce"
        initiales={{
          titre: "",
          description: "",
          prix: "",
          categorie: "",
          ville: profil?.ville ?? "",
          codePostal: "",
          mainPropre: true,
          livraison: false,
          formatColis: "",
          photos: [],
          caracteristiques: {},
        }}
      />
    </CadreCompte>
  );
}
