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
      className="rounded-full bg-action px-6 py-3 font-semibold text-sur-action transition-[transform,box-shadow,opacity] duration-200 ease-verre hover:-translate-y-px hover:shadow-[var(--ombre)] disabled:translate-y-0 disabled:opacity-60"
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
