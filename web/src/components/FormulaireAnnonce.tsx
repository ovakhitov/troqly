"use client";

import { useActionState } from "react";
import type { EtatAnnonce } from "@/app/annonces/actions";
import { ChoixPhotos } from "./ChoixPhotos";
import { BoutonEnvoyer, Champ, Message } from "./Formulaire";

export type ValeursAnnonce = {
  titre: string;
  description: string;
  prix: string;
  categorie: string;
  ville: string;
  codePostal: string;
  mainPropre: boolean;
  livraison: boolean;
  photos: string[];
};

type Props = {
  action: (etat: EtatAnnonce, formData: FormData) => Promise<EtatAnnonce>;
  idUtilisateur: string;
  categories: { slug: string; libelle: string }[];
  initiales: ValeursAnnonce;
  libelleBouton: string;
};

export function FormulaireAnnonce({ action, idUtilisateur, categories, initiales, libelleBouton }: Props) {
  const [etat, envoyer] = useActionState(action, {});
  const v = etat.valeurs ?? initiales;

  return (
    <form action={envoyer} className="grid gap-6" noValidate>
      <Message erreur={etat.erreur} />

      <ChoixPhotos idUtilisateur={idUtilisateur} initiales={initiales.photos} />

      <Champ id="titre" libelle="Titre" required minLength={5} maxLength={80} defaultValue={v.titre} placeholder="Ex. : Vélo de ville Peugeot, cadre 54" />

      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="categorie" className="text-sm font-semibold text-prune-nuit">
          Catégorie
        </label>
        <select
          id="categorie"
          name="categorie"
          required
          defaultValue={v.categorie}
          className="w-full rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none focus:border-prune"
        >
          <option value="" disabled>
            Choisissez une catégorie
          </option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.libelle}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="description" className="text-sm font-semibold text-prune-nuit">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          defaultValue={v.description}
          aria-describedby="description-aide"
          className="w-full rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none focus:border-prune"
        />
        <p id="description-aide" className="text-xs text-mauve">
          État, dimensions, marque, défauts éventuels. Ne donnez pas votre numéro ni votre adresse.
        </p>
      </div>

      <Champ id="prix" libelle="Prix (€)" inputMode="decimal" required defaultValue={v.prix} placeholder="Ex. : 25 ou 12,50" />

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Champ id="ville" libelle="Ville" autoComplete="address-level2" required maxLength={80} defaultValue={v.ville} />
        <Champ id="codePostal" libelle="Code postal" autoComplete="postal-code" inputMode="numeric" required maxLength={5} defaultValue={v.codePostal} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-prune-nuit">Remise de l&apos;objet</legend>
        <label className="flex items-center gap-3 text-prune-nuit">
          <input type="checkbox" name="mainPropre" defaultChecked={v.mainPropre} className="size-4 accent-[var(--action)]" />
          En main propre
        </label>
        <label className="flex items-center gap-3 text-prune-nuit">
          <input type="checkbox" name="livraison" defaultChecked={v.livraison} className="size-4 accent-[var(--action)]" />
          Livraison
        </label>
      </fieldset>

      <BoutonEnvoyer enCours="Enregistrement…">{libelleBouton}</BoutonEnvoyer>
    </form>
  );
}
