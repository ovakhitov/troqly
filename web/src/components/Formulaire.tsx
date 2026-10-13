"use client";

import { useFormStatus } from "react-dom";

// Éléments de formulaire partagés par les pages de compte

export function Champ({
  id,
  libelle,
  aide,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; libelle: string; aide?: string }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-prune-nuit">
        {libelle}
      </label>
      <input
        id={id}
        name={id}
        aria-describedby={aide ? `${id}-aide` : undefined}
        className="w-full min-w-0 rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none transition-colors duration-200 placeholder:text-mauve focus:border-prune"
        {...props}
      />
      {aide && (
        <p id={`${id}-aide`} className="text-xs text-mauve">
          {aide}
        </p>
      )}
    </div>
  );
}

export function BoutonEnvoyer({ children, enCours }: { children: React.ReactNode; enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bouton"
    >
      {pending ? enCours : children}
    </button>
  );
}

export function Message({ erreur, succes }: { erreur?: string; succes?: string }) {
  if (erreur) {
    return (
      <p role="alert" className="rounded-champ border border-abricot bg-surface px-4 py-3 text-sm text-prune-nuit">
        {erreur}
      </p>
    );
  }
  if (succes) {
    return (
      <p role="status" className="rounded-champ border border-statut bg-surface px-4 py-3 text-sm text-prune-nuit">
        {succes}
      </p>
    );
  }
  return null;
}

// Choix unique en pastilles (genre, état, type…). Contrôlé si « valeur » est fourni ;
// toucher de nouveau la pastille choisie la décoche quand le choix est facultatif.
export function Pastilles({
  nom,
  legende,
  options,
  valeur,
  defaut,
  onChange,
  requis = false,
  aide,
}: {
  nom: string;
  legende: string;
  options: readonly { valeur: string; libelle: string }[];
  valeur?: string;
  defaut?: string;
  onChange?: (valeur: string) => void;
  requis?: boolean;
  aide?: string;
}) {
  return (
    <fieldset className="grid min-w-0 gap-2" aria-describedby={aide ? `${nom}-aide` : undefined}>
      <legend className="mb-2 text-sm font-semibold text-prune-nuit">
        {legende}
        {requis && <span className="sr-only"> (obligatoire)</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.valeur} className="relative">
            <input
              type="radio"
              name={nom}
              value={o.valeur}
              required={requis}
              className="peer sr-only"
              {...(valeur !== undefined
                ? {
                    checked: valeur === o.valeur,
                    onChange: () => onChange?.(o.valeur),
                    onClick: () => !requis && valeur === o.valeur && onChange?.(""),
                  }
                : { defaultChecked: defaut === o.valeur })}
            />
            <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-ligne bg-surface px-4 text-[15px] text-prune-nuit transition-colors duration-150 select-none peer-checked:border-action peer-checked:bg-action peer-checked:font-semibold peer-checked:text-sur-action peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-abricot hover:border-prune">
              {o.libelle}
            </span>
          </label>
        ))}
      </div>
      {aide && (
        <p id={`${nom}-aide`} className="text-xs text-mauve">
          {aide}
        </p>
      )}
    </fieldset>
  );
}
