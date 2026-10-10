"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { enregistrerInformations, type EtatFormulaire } from "../actions";

type Props = {
  prenom: string;
  nom: string;
  telephone: string;
  // Date déjà enregistrée (AAAA-MM-JJ), ou null si les informations n'ont jamais été saisies
  dateNaissance: string | null;
  naissanceMax: string;
  succesInitial?: string;
};

export function FormulaireInformations({ prenom, nom, telephone, dateNaissance, naissanceMax, succesInitial }: Props) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(enregistrerInformations, {
    succes: succesInitial,
    valeurs: { prenom, nom, telephone },
  });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} succes={etat.succes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ id="prenom" libelle="Prénom" autoComplete="given-name" required maxLength={50} defaultValue={etat.valeurs?.prenom} />
        <Champ id="nom" libelle="Nom" autoComplete="family-name" required maxLength={50} defaultValue={etat.valeurs?.nom} />
      </div>
      {dateNaissance ? (
        <p className="text-sm text-mauve">
          Date de naissance : {new Date(`${dateNaissance}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
        </p>
      ) : (
        <Champ
          id="dateNaissance"
          libelle="Date de naissance"
          type="date"
          autoComplete="bday"
          required
          max={naissanceMax}
          aide="Troqly est réservé aux personnes majeures. Elle ne pourra plus être modifiée."
          defaultValue={etat.valeurs?.dateNaissance}
        />
      )}
      <Champ
        id="telephone"
        libelle="Téléphone (facultatif)"
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        defaultValue={etat.valeurs?.telephone}
      />
      <BoutonEnvoyer enCours="Enregistrement…">Enregistrer mes informations</BoutonEnvoyer>
    </form>
  );
}
