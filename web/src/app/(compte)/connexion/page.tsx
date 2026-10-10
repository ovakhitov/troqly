import type { Metadata } from "next";
import { CadreCompte } from "@/components/CadreCompte";
import { cheminSur } from "@/lib/validation";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Se connecter | Troqly" };

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suivant?: string; erreur?: string }>;
}) {
  const { suivant, erreur } = await searchParams;
  return (
    <CadreCompte titre="Se connecter" intro="Retrouvez vos annonces, vos messages et vos ventes.">
      <FormulaireConnexion
        suivant={cheminSur(suivant)}
        erreurInitiale={
          erreur === "lien" ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau ou connectez-vous." : undefined
        }
      />
    </CadreCompte>
  );
}
