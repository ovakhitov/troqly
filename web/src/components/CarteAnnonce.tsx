import Image from "next/image";
import Link from "next/link";
import { formaterDateRelative, formaterPrix, type DonneesCarte } from "@/lib/annonces";

// La photo porte l'annonce ; le prix est écrit sur une étiquette accrochée à la photo
export function CarteAnnonce({ annonce, prioritaire = false }: { annonce: DonneesCarte; prioritaire?: boolean }) {
  const remises = [annonce.mainPropre && "Main propre", annonce.livraison && "Livraison"].filter(Boolean).join(" · ");
  return (
    <article className="group relative grid content-start gap-2.5">
      <div className="relative aspect-[4/5] overflow-hidden rounded-photo bg-creux sm:aspect-[4/3]">
        {annonce.photo ? (
          <Image
            src={annonce.photo}
            alt=""
            fill
            sizes="(min-width: 1152px) 270px, (min-width: 640px) 30vw, 46vw"
            className="object-cover transition-transform duration-500 ease-verre group-hover:scale-[1.03]"
            priority={prioritaire}
          />
        ) : (
          <div className="grid size-full place-items-center text-sm text-mauve">Sans photo</div>
        )}
        {annonce.statut !== "publiee" && (
          <span className="verre-fort absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-prune-nuit uppercase">
            {annonce.statut === "reservee" ? "Réservé" : "Vendu"}
          </span>
        )}
        <span className="etiquette absolute bottom-2.5 left-2 -rotate-3 text-[15px] transition-transform duration-300 ease-verre group-hover:-rotate-6 sm:text-base">
          {formaterPrix(annonce.prixCentimes)}
        </span>
      </div>

      <div className="grid gap-0.5 px-0.5">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-prune-nuit">
          <Link
            href={`/annonces/${annonce.id}`}
            className="rounded-sm outline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {annonce.titre}
          </Link>
        </h3>
        <p className="truncate text-[13px] text-mauve">
          {annonce.ville} · {formaterDateRelative(annonce.creeLe)}
        </p>
        {remises && <p className="truncate text-[13px] text-mauve">{remises}</p>}
      </div>
    </article>
  );
}
