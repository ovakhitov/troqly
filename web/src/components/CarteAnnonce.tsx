import Link from "next/link";
import { formaterPrix, type Annonce } from "@/lib/exemples";

const libellesStatut = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
} as const;

// Carte opaque pour la lisibilité ; le verre n'apparaît que sur les pastilles posées sur la photo
export function CarteAnnonce({ annonce }: { annonce: Annonce }) {
  return (
    <article className="group relative grid gap-3 rounded-carte border border-ligne bg-surface p-2.5 transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-0.5 hover:shadow-[var(--ombre)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo">
        <div className="absolute inset-0" style={{ background: annonce.visuel }} aria-hidden="true" />
        <span className="verre-fort absolute bottom-2.5 left-2.5 rounded-full px-3 py-1 font-titre text-base font-semibold tabular-nums text-prune-nuit">
          {formaterPrix(annonce.prixCentimes)}
        </span>
        {/* Bouton favori ajouté avec la fonctionnalité favoris (étape Contact et modération) */}
      </div>

      <div className="grid gap-1 px-1">
        <h3 className="line-clamp-2 font-titre text-base leading-snug font-semibold text-prune-nuit">
          <Link href={`/annonces/${annonce.id}`} className="after:absolute after:inset-0 after:content-['']">
            {annonce.titre}
          </Link>
        </h3>
        <p className="text-[13px] text-mauve">
          {annonce.ville} · {annonce.publieeLe}
        </p>
      </div>

      <ul className="flex flex-wrap gap-1.5 px-1 pb-1">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
          {annonce.statut === "disponible" && <i className="size-1.5 rounded-full bg-statut" aria-hidden="true" />}
          {libellesStatut[annonce.statut]}
        </li>
        {annonce.remise.includes("main-propre") && (
          <li className="rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
            Main propre
          </li>
        )}
        {annonce.remise.includes("livraison") && (
          <li className="rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
            Livraison
          </li>
        )}
      </ul>
    </article>
  );
}
