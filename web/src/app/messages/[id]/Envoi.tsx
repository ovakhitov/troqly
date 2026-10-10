"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { BoutonEnvoyer, Message } from "@/components/Formulaire";
import { envoyerMessage, type EtatMessage } from "../actions";

// Zone de saisie + rafraîchissement régulier tant que l'onglet est visible
export function Envoi({ idConversation, desactive }: { idConversation: string; desactive?: string }) {
  const router = useRouter();
  const [etat, action] = useActionState<EtatMessage, FormData>(envoyerMessage.bind(null, idConversation), {});

  useEffect(() => {
    const minuteur = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => clearInterval(minuteur);
  }, [router]);

  if (desactive) {
    return <p className="rounded-champ border border-ligne bg-ivoire px-4 py-3 text-sm text-mauve">{desactive}</p>;
  }

  return (
    <form action={action} className="grid gap-3">
      <Message erreur={etat.erreur} />
      <label htmlFor="contenu" className="sr-only">
        Votre message
      </label>
      <textarea
        id="contenu"
        name="contenu"
        required
        maxLength={2000}
        rows={3}
        placeholder="Écrivez votre message…"
        className="w-full rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none focus:border-prune"
        onKeyDown={(e) => {
          // Ctrl+Entrée (ou Cmd+Entrée) envoie le message
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-mauve">Ne partagez jamais vos coordonnées bancaires.</span>
        <BoutonEnvoyer enCours="Envoi…">Envoyer</BoutonEnvoyer>
      </div>
    </form>
  );
}
