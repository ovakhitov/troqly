import type { Metadata } from "next";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireOubli } from "./FormulaireOubli";

export const metadata: Metadata = { title: "Mot de passe oublié | Troqly" };

export default function PageMotDePasseOublie() {
  return (
    <CadreCompte titre="Mot de passe oublié" intro="Nous vous envoyons un lien pour en choisir un nouveau.">
      <FormulaireOubli />
    </CadreCompte>
  );
}
