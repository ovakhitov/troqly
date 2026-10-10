import { repondreOffre } from "@/app/offres/actions";
import { formaterPrix } from "@/lib/annonces";
import type { Offre } from "@/lib/offres";

// Boutons du vendeur face à une offre en attente : accepter, refuser ou contre-proposer
export function ReponseOffre({ offre, pseudo, prixAnnonce }: { offre: Offre; pseudo: string; prixAnnonce: number }) {
  return (
    <li className="grid gap-2 border-t border-ligne pt-3 first:border-t-0 first:pt-0">
      <p className="text-sm text-prune-nuit">
        <strong>{pseudo}</strong> propose <strong className="tabular-nums">{formaterPrix(offre.montant_centimes)}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <form action={repondreOffre.bind(null, offre.id, offre.annonce, "accepter")}>
          <button type="submit" className="rounded-full bg-action px-3 py-1.5 text-xs font-semibold text-sur-action">
            Accepter
          </button>
        </form>
        <form action={repondreOffre.bind(null, offre.id, offre.annonce, "refuser")}>
          <button type="submit" className="rounded-full border border-ligne px-3 py-1.5 text-xs font-semibold text-prune-nuit">
            Refuser
          </button>
        </form>
        <form action={repondreOffre.bind(null, offre.id, offre.annonce, "contre")} className="flex gap-1.5">
          <label htmlFor={`contre-${offre.id}`} className="sr-only">
            Contre-proposition en euros
          </label>
          <input
            id={`contre-${offre.id}`}
            name="contre"
            inputMode="decimal"
            required
            placeholder={`${formaterPrix(offre.montant_centimes + 1)} à ${formaterPrix(prixAnnonce - 1)}`}
            aria-describedby={`contre-aide-${offre.id}`}
            className="w-40 rounded-full border border-ligne bg-surface px-3 py-1.5 text-xs text-prune-nuit outline-none focus:border-prune"
          />
          <button type="submit" className="rounded-full border border-ligne px-3 py-1.5 text-xs font-semibold text-prune-nuit">
            Proposer
          </button>
        </form>
      </div>
      <p id={`contre-aide-${offre.id}`} className="text-xs text-mauve">
        Une contre-proposition doit être supérieure à l&apos;offre et inférieure à votre prix ({formaterPrix(prixAnnonce)}). Une
        offre acceptée laisse 48 heures à l&apos;acheteur pour payer.
      </p>
    </li>
  );
}
