"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { modifierProfil, type EtatFormulaire } from "../actions";

export function FormulaireProfil({ pseudo, ville }: { pseudo: string; ville: string }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(modifierProfil, {
    valeurs: { pseudo, ville },
  });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} succes={etat.succes} />
      <Champ id="pseudo" libelle="Pseudo" required minLength={3} maxLength={30} defaultValue={etat.valeurs?.pseudo} />
      <Champ
        id="ville"
        libelle="Ville"
        autoComplete="address-level2"
        maxLength={80}
        aide="Affichée sur vos annonces pour les acheteurs proches."
        defaultValue={etat.valeurs?.ville}
      />
      <BoutonEnvoyer enCours="Enregistrement…">Enregistrer le profil</BoutonEnvoyer>
    </form>
  );
}
