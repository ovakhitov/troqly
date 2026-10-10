"use client";

import { useActionState, useRef } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { supprimerMonCompte, type EtatFormulaire } from "../actions";

export function SupprimerCompte() {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [etat, action] = useActionState<EtatFormulaire, FormData>(supprimerMonCompte, {});

  return (
    <>
      <button
        type="button"
        onClick={() => dialogue.current?.showModal()}
        className="justify-self-start text-sm font-semibold text-mauve hover:text-prune-nuit hover:underline"
      >
        Supprimer mon compte
      </button>
      <dialog
        ref={dialogue}
        aria-labelledby="titre-suppression-compte"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-carte border border-ligne bg-surface p-6 text-prune-nuit backdrop:bg-black/40"
      >
        <form action={action} className="grid gap-4">
          <h2 id="titre-suppression-compte" className="font-titre text-lg font-semibold">
            Supprimer mon compte
          </h2>
          <p className="text-sm text-mauve">
            Vos annonces, photos, messages, favoris et informations personnelles seront supprimés définitivement. Cette action
            ne peut pas être annulée.
          </p>
          <Message erreur={etat.erreur} />
          <Champ id="confirmation" libelle="Tapez SUPPRIMER pour confirmer" autoComplete="off" required />
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" autoFocus onClick={() => dialogue.current?.close()} className="font-semibold text-prune hover:underline">
              Annuler
            </button>
            <BoutonEnvoyer enCours="Suppression…">Supprimer définitivement</BoutonEnvoyer>
          </div>
        </form>
      </dialog>
    </>
  );
}
