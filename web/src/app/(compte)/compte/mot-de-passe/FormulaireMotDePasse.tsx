"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { changerMotDePasse, type EtatFormulaire } from "../../actions";

export function FormulaireMotDePasse() {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(changerMotDePasse, {});

  if (etat.succes) {
    return (
      <>
        <Message succes={etat.succes} />
        <Link href="/compte" className="text-sm font-semibold text-prune hover:underline">
          Retour à mon compte
        </Link>
      </>
    );
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} />
      <Champ
        id="motDePasse"
        libelle="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        aide="Au moins 12 caractères, dont une lettre et un chiffre."
      />
      <Champ id="confirmation" libelle="Confirmez le mot de passe" type="password" autoComplete="new-password" required />
      <BoutonEnvoyer enCours="Enregistrement…">Changer le mot de passe</BoutonEnvoyer>
    </form>
  );
}
