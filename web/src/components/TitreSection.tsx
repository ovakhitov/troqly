import Link from "next/link";
import { IconeFleche } from "./Icones";

// Titre de section, avec un lien « tout voir » à droite
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
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 id={id} className="font-titre text-[1.75rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-3xl">
        {titre}
      </h2>
      {lien && (
        <Link
          href={lien.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-prune underline-offset-4 hover:underline"
        >
          {lien.libelle}
          <IconeFleche className="size-4" />
        </Link>
      )}
    </div>
  );
}
