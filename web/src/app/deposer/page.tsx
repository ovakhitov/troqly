import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireAnnonce } from "@/components/FormulaireAnnonce";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { creerAnnonce } from "../annonces/actions";

export const metadata: Metadata = { title: "Déposer une annonce | Troqly" };

export default async function PageDeposer() {
  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/connexion?suivant=/deposer");

  const [{ data: peutPublier }, { data: categories }, { data: profil }] = await Promise.all([
    supabase.rpc("peut_publier"),
    supabase.from("categories").select("slug, libelle").order("ordre"),
    supabase.from("profils").select("ville").eq("id", id).single(),
  ]);

  if (!peutPublier) {
    return (
      <CadreCompte titre="Déposer une annonce">
        <p className="text-prune-nuit">
          Avant votre première annonce, complétez vos informations personnelles. Elles restent privées et ne sont jamais
          affichées.
        </p>
        <Link
          href="/compte"
          className="justify-self-start rounded-full bg-action px-6 py-3 font-semibold text-sur-action transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)]"
        >
          Compléter mon compte
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
          photos: [],
        }}
      />
    </CadreCompte>
  );
}
