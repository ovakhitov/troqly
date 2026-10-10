"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { validerCode, type EtatCode } from "../actions";

export function SaisieCode({ idCommande }: { idCommande: string }) {
  const [etat, action] = useActionState<EtatCode, FormData>(validerCode.bind(null, idCommande), {});
  return (
    <form action={action} className="grid gap-3">
      <Message erreur={etat.erreur} />
      <Champ
        id="code"
        libelle="Code de remise donné par l'acheteur"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        required
        aide="Saisissez-le seulement quand l'acheteur a l'objet en main. Le paiement vous est alors versé."
      />
      <BoutonEnvoyer enCours="Vérification…">Valider la remise</BoutonEnvoyer>
    </form>
  );
}
