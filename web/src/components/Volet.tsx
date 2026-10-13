import { IconePlus } from "./Icones";

// Section repliable des pages de compte : le titre et un résumé restent visibles,
// le formulaire ne s'ouvre qu'à la demande (ou d'office s'il reste quelque chose à faire)
export function Volet({
  titre,
  resume,
  ouvert = false,
  children,
}: {
  titre: string;
  resume?: string;
  ouvert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={ouvert} className="group border-t border-ligne first:border-t-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="grid min-w-0 gap-0.5">
          <span className="font-titre text-[17px] font-semibold text-prune-nuit">{titre}</span>
          {resume && <span className="truncate text-sm text-mauve">{resume}</span>}
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-ligne text-prune transition-transform duration-200 ease-verre group-open:rotate-45">
          <IconePlus className="size-3" />
        </span>
      </summary>
      <div className="grid gap-4 pt-1 pb-5">{children}</div>
    </details>
  );
}
