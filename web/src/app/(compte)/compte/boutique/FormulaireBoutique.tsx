"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { enregistrerBoutique, type EtatFormulaire } from "../../actions";

export function FormulaireBoutique({
  nom,
  description,
  suivant,
  libelleBouton = "Enregistrer la boutique",
}: {
  nom: string;
  description: string;
  suivant?: string;
  libelleBouton?: string;
}) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(enregistrerBoutique, {
    valeurs: { nom, description },
  });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} succes={etat.succes} />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}
      <Champ
        id="nomBoutique"
        libelle="Nom de la boutique"
        required
        minLength={3}
        maxLength={40}
        placeholder="Ex. : Le Grenier de Léa"
        aide="Affiché sur chacune de vos annonces. Il doit être unique."
        defaultValue={etat.valeurs?.nom}
      />
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="descriptionBoutique" className="text-sm font-semibold text-prune-nuit">
          Présentation <span className="font-normal text-mauve">(facultatif)</span>
        </label>
        <textarea
          id="descriptionBoutique"
          name="descriptionBoutique"
          maxLength={600}
          rows={3}
          placeholder="Ce que vous vendez, quand vous êtes disponible pour les remises…"
          defaultValue={etat.valeurs?.description}
          className="w-full rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none placeholder:text-mauve focus:border-prune"
        />
      </div>
      <BoutonEnvoyer enCours="Enregistrement…">{libelleBouton}</BoutonEnvoyer>
    </form>
  );
}
