import Link from "next/link";
import { IconeChevron } from "./Icones";

// Titre de section serré. Avec un lien, le titre entier mène à « tout voir », suivi d'un chevron.
export function TitreSection({
  titre,
  lien,
  id,
}: {
  titre: string;
  lien?: { href: string; libelle: string };
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <h2 id={id} className="text-[1.375rem] leading-tight font-semibold tracking-[-0.04em] text-balance text-prune-nuit sm:text-[1.625rem]">
        {titre}
      </h2>
      {lien && (
        <Link href={lien.href} className="pilule min-h-9 px-3.5 text-sm font-medium">
          {lien.libelle}
          <IconeChevron className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
