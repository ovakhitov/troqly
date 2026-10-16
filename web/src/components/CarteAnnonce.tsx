import Image from "next/image";
import Link from "next/link";
import { formaterDateRelative, formaterPrix, type DonneesCarte } from "@/lib/annonces";
import { BordureNeon } from "./BordureNeon";

// Décalage de la lumière néon tiré de l'identifiant : stable d'un affichage à l'autre, différent d'une carte à l'autre
const departNeon = (id: string) => (([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) * 17) % 50) / 10;

// Carte flottante : la photo carrée porte l'annonce, encadrée d'un filet blanc (rayon 20 dans une carte de 28),
// le prix est posé sur la photo, le titre et la ville en dessous
export function CarteAnnonce({ annonce, prioritaire = false }: { annonce: DonneesCarte; prioritaire?: boolean }) {
  const remises = [annonce.mainPropre && "Main propre", annonce.livraison && "Livraison"].filter(Boolean).join(" · ");
  const photo = (
    <div className="relative aspect-square overflow-hidden rounded-photo bg-creux">
      {annonce.photo ? (
        <Image
          src={annonce.photo}
          alt=""
          fill
          sizes="(min-width: 1200px) 280px, (min-width: 640px) 30vw, 46vw"
          className="object-cover transition-transform duration-500 ease-verre group-hover:scale-[1.03]"
          priority={prioritaire}
        />
      ) : (
        <div className="grid size-full place-items-center text-sm text-mauve">Sans photo</div>
      )}
      {/* Mention obligatoire : une annonce boostée est mise en avant contre paiement ou par Troqly */}
      {annonce.boostee && (
        <span className="verre-fort absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-abricot">
          Boostée
        </span>
      )}
      {annonce.statut !== "publiee" && (
        <span className="verre-fort absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
          {annonce.statut === "reservee" ? "Réservé" : "Vendu"}
        </span>
      )}
      <span className="etiquette absolute bottom-2 left-2 text-[15px] sm:text-base">{formaterPrix(annonce.prixCentimes)}</span>
    </div>
  );

  return (
    <article className="group carte relative grid content-start gap-2.5 p-1.5 transition-[box-shadow,translate] duration-300 ease-verre hover:-translate-y-0.5 hover:shadow-large sm:p-2">
      {annonce.boostee ? <BordureNeon depart={departNeon(annonce.id)}>{photo}</BordureNeon> : photo}

      <div className="grid gap-0.5 px-1.5 pb-2 sm:px-2">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-medium tracking-[-0.015em] text-prune-nuit">
          <Link
            href={`/annonces/${annonce.id}`}
            className="rounded-sm outline-offset-4 after:absolute after:inset-0 after:rounded-carte after:content-['']"
          >
            {annonce.titre}
          </Link>
        </h3>
        <p className="truncate text-[13px] text-mauve">
          {annonce.ville} · {formaterDateRelative(annonce.creeLe)}
        </p>
        {remises && <p className="hidden truncate text-[13px] text-mauve sm:block">{remises}</p>}
      </div>
    </article>
  );
}
