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

// Teintes des pastilles et des points : un fond léger de la couleur, le texte dans la couleur pleine
export const TEINTES = {
  prune: { puce: "bg-prune/12 text-prune", point: "bg-prune" },
  info: { puce: "bg-info/12 text-info", point: "bg-info" },
  alerte: { puce: "bg-alerte/12 text-alerte", point: "bg-alerte" },
  statut: { puce: "bg-statut/12 text-statut", point: "bg-statut" },
  abricot: { puce: "bg-abricot/12 text-abricot", point: "bg-abricot" },
  neutre: { puce: "bg-mauve/12 text-mauve", point: "bg-mauve" },
} as const;

export type Teinte = keyof typeof TEINTES;

const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

// Titre de page : fil d'Ariane avec la date du jour, grand titre, badge éventuel (mode test)
export function EnTetePage({ titre, badge, children }: { titre: string; badge?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <p className="text-sm text-mauve">Administration · {jourLong.format(new Date())}</p>
        <h1 className="flex flex-wrap items-center gap-3 font-titre text-3xl font-semibold tracking-tight text-balance text-prune-nuit sm:text-4xl">
          {titre}
          {badge && (
            <span className="rounded-full border border-info/40 bg-info/12 px-2.5 py-0.5 font-sans text-xs font-bold tracking-wider text-info uppercase">
              {badge}
            </span>
          )}
        </h1>
      </div>
      {children}
    </header>
  );
}

// Carte chiffrée : pastille de couleur, grand montant, précision en dessous
export function CarteChiffre({ libelle, valeur, detail, teinte, href }: { libelle: string; valeur: string; detail: string; teinte: Teinte; href?: string }) {
  const contenu = (
    <>
      <span className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold ${TEINTES[teinte].puce}`}>{libelle}</span>
      <span className="mt-2 font-titre text-2xl font-semibold tracking-tight text-prune-nuit tabular-nums sm:text-3xl">{valeur}</span>
      <span className="text-xs text-mauve">{detail}</span>
    </>
  );
  const classe = "grid min-w-0 content-start gap-1 rounded-carte border border-ligne bg-surface p-4 sm:p-5";
  return href ? (
    <Link href={href} className={`${classe} transition-colors duration-150 hover:border-prune`}>
      {contenu}
    </Link>
  ) : (
    <div className={classe}>{contenu}</div>
  );
}

export function RangeeChiffres({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{children}</div>;
}

// Carte de contenu avec son titre et une indication à droite
export function Carte({ titre, indication, children, className = "" }: { titre: string; indication?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 rounded-carte border border-ligne bg-surface p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-titre text-lg font-semibold tracking-tight text-prune-nuit">{titre}</h2>
        {indication && <span className="text-xs text-mauve">{indication}</span>}
      </div>
      {children}
    </section>
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
          href={`${base}${base.includes("?") ? "&" : "?"}filtre=${v}`}
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
