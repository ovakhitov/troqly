import Link from "next/link";
import type { ReactNode } from "react";

// Petits éléments communs aux pages d'administration, dans le style de la modération

export const bouton =
  "rounded-[10px] border border-ligne px-3 py-1.5 text-xs font-semibold text-prune-nuit transition-colors duration-200 hover:border-prune";
export const boutonFort =
  "rounded-[10px] bg-action px-3 py-1.5 text-xs font-semibold text-sur-action transition-colors duration-150 hover:bg-action-survol";
export const boutonDanger =
  "rounded-[10px] border border-abricot px-3 py-1.5 text-xs font-semibold text-abricot transition-colors duration-150 hover:bg-abricot hover:text-white";
export const champ =
  "min-w-0 rounded-[10px] border border-ligne bg-surface px-3 py-1.5 text-xs text-prune-nuit outline-none focus:border-prune";

export const SECTIONS = [
  ["apercu", "Vue d'ensemble"],
  ["argent", "Argent"],
  ["membres", "Comptes"],
  ["annonces", "Annonces"],
] as const;

export type Section = (typeof SECTIONS)[number][0];

export function Onglets({ actif }: { actif: Section | null }) {
  const classe = (courant: boolean) =>
    `rounded-[10px] px-4 py-2 text-sm font-semibold whitespace-nowrap ${
      courant ? "bg-action text-sur-action" : "border border-ligne bg-surface text-prune-nuit hover:border-prune"
    }`;
  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Sections de l'administration">
      {SECTIONS.map(([s, libelle]) => (
        <Link key={s} href={s === "apercu" ? "/admin" : `/admin?section=${s}`} aria-current={s === actif ? "page" : undefined} className={classe(s === actif)}>
          {libelle}
        </Link>
      ))}
      <Link href="/moderation" className={classe(false)}>
        Modération
      </Link>
      <Link href="/moderation?onglet=journal" className={classe(false)}>
        Journal
      </Link>
    </nav>
  );
}

export function Messages({ ok, erreur }: { ok?: string; erreur?: string }) {
  return (
    <>
      {ok && (
        <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
          {ok}
        </p>
      )}
      {erreur && (
        <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
          {erreur}
        </p>
      )}
    </>
  );
}

export function Vide({ texte }: { texte: string }) {
  return <p className="rounded-carte border border-ligne bg-surface p-6 text-mauve">{texte}</p>;
}

// Page sur laquelle revenir après une action (lue par actions.ts)
export function Retour({ vers }: { vers: string }) {
  return <input type="hidden" name="retour" value={vers} />;
}

// Case obligatoire des actions sensibles (argent, suppressions)
export function Confirmer({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-xs text-prune-nuit">
      <input type="checkbox" name="confirme" required className="mt-0.5 size-4 shrink-0 accent-[var(--action)]" />
      <span>{children}</span>
    </label>
  );
}

// Volet « Gérer » d'une ligne : les actions restent repliées pour éviter les clics par erreur
export function Gerer({ children, libelle = "Gérer" }: { children: ReactNode; libelle?: string }) {
  return (
    <details className="group col-span-full">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-[10px] text-xs font-semibold text-prune hover:underline">
        {libelle}
        <span aria-hidden className="transition-transform duration-200 group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 grid gap-3 border-t border-ligne pt-3">{children}</div>
    </details>
  );
}

// Filtres en pastilles (liens), comme les catégories
export function Filtres({ options, actif, base }: { options: readonly (readonly [string, string])[]; actif: string; base: string }) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Filtrer">
      {options.map(([v, l]) => (
        <Link
          key={v}
          href={`${base}&filtre=${v}`}
          aria-current={v === actif ? "true" : undefined}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            v === actif ? "bg-prune-nuit text-ivoire" : "border border-ligne text-prune-nuit hover:border-prune"
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

export const dateCourte = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

export const ROLES: Record<string, string> = { utilisateur: "Membre", moderateur: "Modérateur", administrateur: "Administrateur" };
