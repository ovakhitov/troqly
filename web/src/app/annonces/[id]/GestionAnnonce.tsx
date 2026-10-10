"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { libellesStatut, type StatutAnnonce } from "@/lib/annonces";
import { changerStatut, supprimerAnnonce } from "../actions";

// Outils du vendeur sur sa propre annonce
export function GestionAnnonce({ id, statut }: { id: string; statut: StatutAnnonce }) {
  const [enCours, demarrer] = useTransition();
  const [confirmer, setConfirmer] = useState(false);

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

      {confirmer ? (
        <div className="flex flex-wrap items-center gap-3 rounded-champ border border-abricot p-3 text-sm text-prune-nuit">
          <span>Supprimer définitivement cette annonce et ses photos ?</span>
          <button
            type="button"
            disabled={enCours}
            onClick={() => demarrer(() => supprimerAnnonce(id))}
            className="rounded-full bg-action px-4 py-2 font-semibold text-sur-action disabled:opacity-60"
          >
            Supprimer
          </button>
          <button type="button" onClick={() => setConfirmer(false)} className="font-semibold text-prune hover:underline">
            Annuler
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmer(true)} className="justify-self-start text-sm font-semibold text-prune hover:underline">
          Supprimer l&apos;annonce
        </button>
      )}
    </section>
  );
}
