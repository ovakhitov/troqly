import Link from "next/link";
import { formaterPrix } from "@/lib/annonces";
import { TEINTES, type Teinte } from "./ui";

// Graphiques du tableau de bord, dessinés côté serveur en SVG (aucune bibliothèque à télécharger)

export type Part = { cle: string; libelle: string; montant: number; teinte: Teinte; href: string };

const COULEUR: Record<Teinte, string> = {
  prune: "var(--prune)",
  info: "var(--info)",
  alerte: "var(--alerte)",
  statut: "var(--statut)",
  abricot: "var(--abricot)",
  neutre: "var(--mauve)",
};

// Anneau « Où en est l'argent » : une part par état, la légende à droite sert de liens et de tableau
export function Anneau({ parts, miseEnAvant }: { parts: Part[]; miseEnAvant: string | null }) {
  const total = parts.reduce((t, p) => t + p.montant, 0);
  const rayon = 62;
  const tour = 2 * Math.PI * rayon;
  const visibles = parts.filter((p) => p.montant > 0);
  const ecart = visibles.length > 1 ? 3 : 0;
  const centre = parts.find((p) => p.cle === miseEnAvant) ?? null;

  let depart = 0;
  const arcs = visibles.map((p) => {
    const longueur = (p.montant / total) * tour;
    const arc = { ...p, longueur: Math.max(longueur - ecart, 1), depart };
    depart += longueur;
    return arc;
  });

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[11rem_1fr]">
      <div className="relative mx-auto size-44">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90" role="img" aria-label="Répartition de l'argent par état, détaillée dans la liste">
          <circle cx="80" cy="80" r={rayon} fill="none" stroke="var(--creux)" strokeWidth="18" />
          {arcs.map((a) => (
            <a key={a.cle} href={a.href}>
              <circle
                cx="80"
                cy="80"
                r={rayon}
                fill="none"
                stroke={COULEUR[a.teinte]}
                strokeWidth="18"
                strokeLinecap={visibles.length > 1 ? "butt" : "round"}
                strokeDasharray={`${a.longueur} ${tour - a.longueur}`}
                strokeDashoffset={-a.depart}
                className="transition-[stroke-width] duration-150 hover:[stroke-width:22]"
              >
                <title>{`${a.libelle} : ${formaterPrix(a.montant)}`}</title>
              </circle>
            </a>
          ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center justify-items-center px-8 text-center">
          {centre && centre.montant > 0 ? (
            <>
              <span className="text-[0.65rem] leading-tight font-semibold tracking-wide text-mauve uppercase">{centre.libelle}</span>
              <span className="font-titre text-xl font-semibold text-prune-nuit tabular-nums">{formaterPrix(centre.montant)}</span>
            </>
          ) : (
            <>
              <span className="text-[0.65rem] leading-tight font-semibold tracking-wide text-mauve uppercase">Au total</span>
              <span className="font-titre text-xl font-semibold text-prune-nuit tabular-nums">{formaterPrix(total)}</span>
            </>
          )}
        </div>
      </div>

      <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
        {parts.map((p) => {
          const pourcent = total ? Math.round((p.montant / total) * 100) : 0;
          return (
            <li key={p.cle}>
              <Link
                href={p.href}
                className={`grid grid-cols-[auto_1fr_auto_2.75rem] items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition-colors duration-150 hover:bg-creux ${
                  p.cle === miseEnAvant && p.montant > 0 ? "bg-creux font-semibold" : ""
                }`}
              >
                <span aria-hidden className={`size-2.5 rounded-full ${TEINTES[p.teinte].point}`} />
                <span className={p.montant ? "text-prune-nuit" : "text-mauve"}>{p.libelle}</span>
                <span className="font-semibold text-prune-nuit tabular-nums">{formaterPrix(p.montant)}</span>
                <span className="text-right text-xs text-mauve tabular-nums">{p.montant ? `${pourcent} %` : ""}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Barres par mois : une seule série (les commissions), étiquette au-dessus des mois non nuls
export function BarresMois({ mois }: { mois: { cle: string; libelle: string; valeur: number; detail: string }[] }) {
  const max = Math.max(1, ...mois.map((m) => m.valeur));
  return (
    <ol className="grid h-52 grid-cols-6 items-end gap-3" aria-label="Frais de service par mois">
      {mois.map((m) => (
        <li key={m.cle} className="grid h-full grid-rows-[1fr_auto] gap-2" title={m.detail}>
          <span className="sr-only">{m.detail}</span>
          <div aria-hidden className="flex flex-col justify-end">
            {m.valeur > 0 && (
              <span className="mb-1.5 text-center text-xs font-semibold text-prune-nuit tabular-nums">{formaterCourt(m.valeur)}</span>
            )}
            <span
              className={`w-full rounded-t-[4px] ${m.valeur > 0 ? "bg-prune" : "bg-ligne"}`}
              style={{ height: m.valeur > 0 ? `${Math.max(4, (m.valeur / max) * 82)}%` : "3px" }}
            />
          </div>
          <span aria-hidden className="text-center text-xs text-mauve">
            {m.libelle}
          </span>
        </li>
      ))}
    </ol>
  );
}

// 1 234,56 € → « 1,2 k€ » au-dessus des barres
function formaterCourt(centimes: number) {
  const euros = centimes / 100;
  if (euros >= 1000) return `${(euros / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k€`;
  return formaterPrix(centimes);
}
