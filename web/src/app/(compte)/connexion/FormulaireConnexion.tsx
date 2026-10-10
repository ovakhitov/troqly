"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { connecter, type EtatFormulaire } from "../actions";

export function FormulaireConnexion({ suivant, erreurInitiale }: { suivant: string; erreurInitiale?: string }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(connecter, { erreur: erreurInitiale });

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="suivant" value={suivant} />
      <Message erreur={etat.erreur} succes={etat.succes} />
      <Champ id="email" libelle="Adresse e-mail" type="email" autoComplete="email" required defaultValue={etat.valeurs?.email} />
      <Champ id="motDePasse" libelle="Mot de passe" type="password" autoComplete="current-password" required />
      <Link href="/mot-de-passe-oublie" className="justify-self-start text-sm font-semibold text-prune hover:underline">
        Mot de passe oublié ?
      </Link>
      <BoutonEnvoyer enCours="Connexion…">Se connecter</BoutonEnvoyer>
      <p className="text-sm text-mauve">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-prune hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
