"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BoutonEnvoyer, Champ, Message } from "@/components/Formulaire";
import { inscrire, type EtatFormulaire } from "../actions";

export function FormulaireInscription({ naissanceMax }: { naissanceMax: string }) {
  const [etat, action] = useActionState<EtatFormulaire, FormData>(inscrire, {});

  if (etat.succes) return <Message succes={etat.succes} />;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <Message erreur={etat.erreur} />

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-mauve uppercase">Vous</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ id="prenom" libelle="Prénom" autoComplete="given-name" required maxLength={50} defaultValue={etat.valeurs?.prenom} />
          <Champ id="nom" libelle="Nom" autoComplete="family-name" required maxLength={50} defaultValue={etat.valeurs?.nom} />
        </div>
        <Champ
          id="dateNaissance"
          libelle="Date de naissance"
          type="date"
          autoComplete="bday"
          required
          max={naissanceMax}
          aide="Troqly est réservé aux personnes majeures."
          defaultValue={etat.valeurs?.dateNaissance}
        />
        <Champ
          id="telephone"
          libelle="Téléphone (facultatif)"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          aide="Jamais affiché sur vos annonces."
          defaultValue={etat.valeurs?.telephone}
        />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-xs font-semibold tracking-wider text-mauve uppercase">Votre compte</legend>
        <Champ
          id="pseudo"
          libelle="Pseudo"
          autoComplete="nickname"
          required
          minLength={3}
          maxLength={30}
          aide="Seul nom visible sur vos annonces. 3 à 30 caractères."
          defaultValue={etat.valeurs?.pseudo}
        />
        <Champ id="email" libelle="Adresse e-mail" type="email" autoComplete="email" required defaultValue={etat.valeurs?.email} />
        <Champ
          id="motDePasse"
          libelle="Mot de passe"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          aide="Au moins 12 caractères, dont une lettre et un chiffre."
        />
      </fieldset>

      <BoutonEnvoyer enCours="Création du compte…">Créer mon compte</BoutonEnvoyer>
      <p className="text-xs text-mauve">
        En créant un compte, vous acceptez les{" "}
        <Link href="/cgu" className="underline">
          conditions d&apos;utilisation
        </Link>{" "}
        de Troqly. Vos données sont traitées selon notre{" "}
        <Link href="/confidentialite" className="underline">
          politique de confidentialité
        </Link>
        .
      </p>
      <p className="text-sm text-mauve">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-prune hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
