"use client";

import { useActionState } from "react";
import { BoutonEnvoyer, Message } from "@/components/Formulaire";
import { formaterPrix } from "@/lib/annonces";
import { libellesOffre, prixConvenu, type Offre } from "@/lib/offres";
import { faireOffre, reponseAcheteur, type EtatOffre } from "../../offres/actions";

const lien = "text-sm font-semibold text-prune hover:underline";

// Côté acheteur : faire une offre, suivre la réponse du vendeur
export function Negociation({ idAnnonce, prixCentimes, offre }: { idAnnonce: string; prixCentimes: number; offre: Offre | null }) {
  const [etat, action] = useActionState<EtatOffre, FormData>(faireOffre.bind(null, idAnnonce), {});
  const ouverte = offre && ["en_attente", "contre_proposee"].includes(offre.statut);

  if (ouverte && offre) {
    return (
      <div className="grid gap-2 rounded-champ border border-ligne p-4 text-sm text-prune-nuit">
        <p>
          Votre offre : <strong className="tabular-nums">{formaterPrix(offre.montant_centimes)}</strong> · {libellesOffre[offre.statut]}
        </p>
        {offre.statut === "contre_proposee" && offre.contre_centimes && (
          <>
            <p>
              Le vendeur vous propose <strong className="tabular-nums">{formaterPrix(offre.contre_centimes)}</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <form action={reponseAcheteur.bind(null, offre.id, idAnnonce, true)}>
                <button type="submit" className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-sur-action">
                  Accepter {formaterPrix(prixConvenu(offre))}
                </button>
              </form>
              <form action={reponseAcheteur.bind(null, offre.id, idAnnonce, false)}>
                <button type="submit" className={lien}>Refuser</button>
              </form>
            </div>
          </>
        )}
        {offre.statut === "en_attente" && (
          <p className="text-xs text-mauve">Si le vendeur accepte, vous aurez 48 heures pour acheter à ce prix.</p>
        )}
        {offre.statut === "en_attente" && (
          <form action={reponseAcheteur.bind(null, offre.id, idAnnonce, false)}>
            <button type="submit" className={lien}>Retirer mon offre</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <Message erreur={etat.erreur} succes={etat.succes} />
      {offre?.statut === "refusee" && <p className="text-xs text-mauve">Votre dernière offre a été refusée. Vous pouvez en proposer une autre.</p>}
      <label htmlFor="montant" className="text-sm font-semibold text-prune-nuit">
        Faire une offre
      </label>
      <div className="flex gap-2">
        <input
          id="montant"
          name="montant"
          inputMode="decimal"
          required
          placeholder={`Moins de ${formaterPrix(prixCentimes)}`}
          className="min-w-0 flex-1 rounded-full border border-ligne bg-surface px-4 py-2.5 text-sm text-prune-nuit outline-none focus:border-prune"
        />
        <BoutonEnvoyer enCours="Envoi…">Proposer</BoutonEnvoyer>
      </div>
      <p className="text-xs text-mauve">Au moins la moitié du prix affiché. Si le vendeur accepte, vous avez 48 heures pour acheter à ce prix.</p>
    </form>
  );
}
