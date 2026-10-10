"use client";

import { useActionState, useRef } from "react";
import { BoutonEnvoyer, Message } from "@/components/Formulaire";
import { signalerAnnonce, type EtatSignalement } from "../actions";

const MOTIFS = [
  ["arnaque", "Arnaque ou tentative de fraude"],
  ["interdit", "Objet interdit à la vente"],
  ["contenu_choquant", "Contenu choquant ou injurieux"],
  ["doublon", "Annonce en double"],
  ["mauvaise_categorie", "Mauvaise catégorie"],
  ["autre", "Autre raison"],
] as const;

export function Signaler({ idAnnonce }: { idAnnonce: string }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [etat, action] = useActionState<EtatSignalement, FormData>(signalerAnnonce.bind(null, idAnnonce), {});

  return (
    <>
      <button
        type="button"
        onClick={() => dialogue.current?.showModal()}
        className="justify-self-start text-sm font-semibold text-mauve underline-offset-2 hover:text-prune-nuit hover:underline"
      >
        Signaler l&apos;annonce
      </button>
      <dialog
        ref={dialogue}
        aria-labelledby={`signaler-${idAnnonce}`}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-carte border border-ligne bg-surface p-6 text-prune-nuit backdrop:bg-black/40"
      >
        {etat.succes ? (
          <div className="grid gap-4">
            <Message succes={etat.succes} />
            <button type="button" autoFocus onClick={() => dialogue.current?.close()} className="justify-self-end font-semibold text-prune hover:underline">
              Fermer
            </button>
          </div>
        ) : (
          <form action={action} className="grid gap-4">
            <h2 id={`signaler-${idAnnonce}`} className="font-titre text-lg font-semibold">
              Signaler cette annonce
            </h2>
            <Message erreur={etat.erreur} />
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold">Motif</legend>
              {MOTIFS.map(([valeur, libelle]) => (
                <label key={valeur} className="flex items-center gap-3 text-sm">
                  <input type="radio" name="motif" value={valeur} required className="size-4 accent-[var(--action)]" />
                  {libelle}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1.5">
              <label htmlFor={`details-${idAnnonce}`} className="text-sm font-semibold">
                Précisions (facultatif)
              </label>
              <textarea
                id={`details-${idAnnonce}`}
                name="details"
                maxLength={1000}
                rows={3}
                className="w-full rounded-champ border border-ligne bg-surface px-4 py-3 outline-none focus:border-prune"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => dialogue.current?.close()} className="font-semibold text-prune hover:underline">
                Annuler
              </button>
              <BoutonEnvoyer enCours="Envoi…">Envoyer le signalement</BoutonEnvoyer>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
