"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { modifierProfil, type EtatFormulaire } from "../actions";

type Valeurs = { prenom: string; nom: string; pseudo: string; ville: string; telephone: string };

export function FormulaireProfil({ valeurs, dateNaissance }: { valeurs: Valeurs; dateNaissance: string | null }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(modifierProfil, { valeurs });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} succes={etat.succes} />

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-mauve uppercase">Visible sur vos annonces</legend>
        <Champ id="pseudo" libelle="Pseudo" required minLength={3} maxLength={30} defaultValue={etat.valeurs?.pseudo} />
        <Champ id="ville" libelle="Ville" autoComplete="address-level2" maxLength={80} defaultValue={etat.valeurs?.ville} />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-mauve uppercase">Privé</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="prenom" libelle="Prénom" autoComplete="given-name" required maxLength={50} defaultValue={etat.valeurs?.prenom} />
          <Champ id="nom" libelle="Nom" autoComplete="family-name" required maxLength={50} defaultValue={etat.valeurs?.nom} />
        </div>
        <Champ id="telephone" libelle="Téléphone (facultatif)" type="tel" autoComplete="tel-national" defaultValue={etat.valeurs?.telephone} />
        {dateNaissance && (
          <p className="text-sm text-mauve">
            Date de naissance : {new Date(`${dateNaissance}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })}
          </p>
        )}
      </fieldset>

      <BoutonEnvoyer enCours="Enregistrement…">Enregistrer</BoutonEnvoyer>
    </form>
  );
}
