import Image from "next/image";
import Link from "next/link";
import { formaterDateRelative, formaterPrix, libellesStatut, type DonneesCarte } from "@/lib/annonces";

// Carte opaque pour la lisibilité ; le verre n'apparaît que sur la pastille de prix posée sur la photo
export function CarteAnnonce({ annonce, prioritaire = false }: { annonce: DonneesCarte; prioritaire?: boolean }) {
  return (
    <article className="group relative grid content-start gap-3 rounded-carte border border-ligne bg-surface p-2.5 transition-[transform,box-shadow] duration-200 ease-verre hover:-translate-y-0.5 hover:shadow-[var(--ombre)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo bg-ivoire">
        {annonce.photo ? (
          <Image
            src={annonce.photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 92vw"
            className="object-cover"
            priority={prioritaire}
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-mauve">Sans photo</div>
        )}
        <span className="verre-fort absolute bottom-2.5 left-2.5 rounded-full px-3 py-1 font-titre text-base font-semibold tabular-nums text-prune-nuit">
          {formaterPrix(annonce.prixCentimes)}
        </span>
      </div>

      <div className="grid gap-1 px-1">
        <h3 className="line-clamp-2 font-titre text-base leading-snug font-semibold text-prune-nuit">
          <Link href={`/annonces/${annonce.id}`} className="after:absolute after:inset-0 after:content-['']">
            {annonce.titre}
          </Link>
        </h3>
        <p className="text-[13px] text-mauve">
          {annonce.ville} · {formaterDateRelative(annonce.creeLe)}
        </p>
      </div>

      <ul className="flex flex-wrap gap-1.5 px-1 pb-1">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
          {annonce.statut === "publiee" && <i className="size-1.5 rounded-full bg-statut" aria-hidden="true" />}
          {libellesStatut[annonce.statut]}
        </li>
        {annonce.mainPropre && (
          <li className="rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">Main propre</li>
        )}
        {annonce.livraison && (
          <li className="rounded-full border border-ligne px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">Livraison</li>
        )}
      </ul>
    </article>
  );
}
