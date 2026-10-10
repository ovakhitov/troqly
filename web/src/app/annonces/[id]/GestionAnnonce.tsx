"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { libellesStatut, type StatutAnnonce } from "@/lib/annonces";
import { changerStatut, supprimerAnnonce } from "../actions";

// Outils du vendeur sur sa propre annonce
export function GestionAnnonce({ id, statut }: { id: string; statut: StatutAnnonce }) {
  const [enCours, demarrer] = useTransition();
  const dialogue = useRef<HTMLDialogElement>(null);
  const [ouvert, setOuvert] = useState(false);

  const bouton =
    "rounded-full border border-ligne px-4 py-2 text-sm font-semibold text-prune-nuit transition-colors duration-200 hover:border-prune disabled:opacity-60";

  return (
    <section className="grid gap-3 rounded-carte border border-ligne bg-surface p-5" aria-label="Gérer mon annonce">
      <h2 className="font-titre text-base font-semibold text-prune-nuit">Gérer mon annonce</h2>
      <div className="flex flex-wrap gap-2">
        <Link href={`/annonces/${id}/modifier`} className={bouton}>
          Modifier
        </Link>
        {(["publiee", "reservee", "vendue"] as const)
          .filter((s) => s !== statut)
          .map((s) => (
            <button key={s} type="button" disabled={enCours} className={bouton} onClick={() => demarrer(() => changerStatut(id, s))}>
              Marquer « {libellesStatut[s]} »
            </button>
          ))}
      </div>

      <button
        type="button"
        onClick={() => {
          dialogue.current?.showModal();
          setOuvert(true);
        }}
        className="justify-self-start text-sm font-semibold text-prune hover:underline"
      >
        Supprimer l&apos;annonce
      </button>

      {/* showModal gère le focus, la touche Échap et le retour au bouton d'origine */}
      <dialog
        ref={dialogue}
        onClose={() => setOuvert(false)}
        aria-labelledby={`suppression-${id}`}
        className="m-auto max-w-sm rounded-carte border border-ligne bg-surface p-6 text-prune-nuit backdrop:bg-black/40"
      >
        {ouvert && (
          <div className="grid gap-4">
            <h3 id={`suppression-${id}`} className="font-titre text-lg font-semibold">
              Supprimer cette annonce ?
            </h3>
            <p className="text-sm text-mauve">L&apos;annonce et ses photos seront supprimées définitivement.</p>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" autoFocus onClick={() => dialogue.current?.close()} className={bouton}>
                Annuler
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => demarrer(() => supprimerAnnonce(id))}
                className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-sur-action disabled:opacity-60"
              >
                {enCours ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
