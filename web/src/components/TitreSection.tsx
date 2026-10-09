import Link from "next/link";
import { IconeFleche } from "./Icones";

// En-tête de section façon Gency : titre à gauche, lien « tout voir » à droite
export function TitreSection({
  titre,
  lien,
}: {
  titre: string;
  lien?: { href: string; libelle: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ligne pb-4">
      <h2 className="font-titre text-2xl font-semibold text-balance text-prune-nuit">{titre}</h2>
      {lien && (
        <Link
          href={lien.href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-prune hover:underline"
        >
          {lien.libelle}
          <IconeFleche className="size-4" />
        </Link>
      )}
    </div>
  );
}
