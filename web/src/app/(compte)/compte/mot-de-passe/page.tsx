import type { Metadata } from "next";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireMotDePasse } from "./FormulaireMotDePasse";

export const metadata: Metadata = { title: "Changer de mot de passe | Troqly" };

export default function PageMotDePasse() {
  return (
    <CadreCompte titre="Nouveau mot de passe">
      <FormulaireMotDePasse />
    </CadreCompte>
  );
}
