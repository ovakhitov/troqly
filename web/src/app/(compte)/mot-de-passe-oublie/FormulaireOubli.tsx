"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { demanderReinitialisation, type EtatFormulaire } from "../actions";

export function FormulaireOubli() {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(demanderReinitialisation, {});

  if (etat.succes) return <Message succes={etat.succes} />;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} />
      <Champ id="email" libelle="Adresse e-mail" type="email" autoComplete="email" required defaultValue={etat.valeurs?.email} />
      <BoutonEnvoyer enCours="Envoi…">Recevoir le lien</BoutonEnvoyer>
    </form>
  );
}
