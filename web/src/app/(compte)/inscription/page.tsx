import type { Metadata } from "next";
import { CadreCompte } from "@/components/CadreCompte";
import { FormulaireInscription } from "./FormulaireInscription";

export const metadata: Metadata = { title: "Créer un compte | Troqly" };

export default function PageInscription() {
  const majorite = new Date();
  majorite.setUTCFullYear(majorite.getUTCFullYear() - 18);

  return (
    <CadreCompte titre="Créer un compte" intro="Gratuit, et nécessaire pour déposer une annonce ou contacter un vendeur.">
      <FormulaireInscription naissanceMax={majorite.toISOString().slice(0, 10)} />
    </CadreCompte>
  );
}
