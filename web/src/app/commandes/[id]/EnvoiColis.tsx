"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { marquerExpediee, type EtatEnvoi } from "../actions";

export function EnvoiColis({ idCommande }: { idCommande: string }) {
  const [etat, action] = useActionState<EtatEnvoi, FormData>(marquerExpediee.bind(null, idCommande), {});
  return (
    <form action={action} className="grid gap-3">
      <Message erreur={etat.erreur} />
      <Champ id="suivi" libelle="Numéro de suivi" autoComplete="off" required maxLength={40} aide="Indiqué sur le reçu remis au dépôt du colis." />
      <BoutonEnvoyer enCours="Enregistrement…">Marquer comme expédié</BoutonEnvoyer>
    </form>
  );
}
