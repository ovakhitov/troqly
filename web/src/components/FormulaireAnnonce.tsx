"use client";

import { useActionState, useCallback, useState } from "react";
import type { EtatAnnonce } from "@/app/annonces/actions";
import { FORMATS_COLIS, libellesFormat } from "@/lib/annonces";
import { nettoyerReponses, questionsDe, rediger, type Question, type Reponses } from "@/lib/caracteristiques";
import { ChoixPhotos } from "./ChoixPhotos";
import { BoutonEnvoyer, Champ, Message, Pastilles } from "./Formulaire";
import { IconeEtincelle } from "./Icones";

export type ValeursAnnonce = {
  titre: string;
  description: string;
  prix: string;
  categorie: string;
  ville: string;
  codePostal: string;
  mainPropre: boolean;
  livraison: boolean;
  formatColis: string;
  photos: string[];
  caracteristiques: Reponses;
};

type Props = {
  action: (etat: EtatAnnonce, formData: FormData) => Promise<EtatAnnonce>;
  idUtilisateur: string;
  categories: { slug: string; libelle: string }[];
  initiales: ValeursAnnonce;
  libelleBouton: string;
  iaDisponible: boolean;
};

type EtatIA =
  | { etape: "repos" }
  | { etape: "analyse" }
  | {
      etape: "fini";
      reconnu: boolean;
      sources: { url: string; site: string }[];
      titreSuggere?: string;
      ancienneDescription?: string;
    }
  | { etape: "erreur"; message: string };

const classeChamp =
  "w-full rounded-champ border border-ligne bg-surface px-4 py-3 text-prune-nuit outline-none placeholder:text-mauve focus:border-prune";

export function FormulaireAnnonce({ action, idUtilisateur, categories, initiales, libelleBouton, iaDisponible }: Props) {
  const [etat, envoyer] = useActionState(action, {});
  const v = etat.valeurs ?? initiales;

  const [titre, setTitre] = useState(initiales.titre);
  const [categorie, setCategorie] = useState(initiales.categorie);
  const [reponses, setReponses] = useState<Reponses>(initiales.caracteristiques);
  // La description suit les réponses tant que le vendeur ne l'a pas écrite lui-même
  const [description, setDescription] = useState(initiales.description);
  const [automatique, setAutomatique] = useState(initiales.description.trim() === "");
  const [livraison, setLivraison] = useState(initiales.livraison);
  const [photos, setPhotos] = useState<{ chemins: string[]; envoiEnCours: number }>({
    chemins: initiales.photos,
    envoiEnCours: 0,
  });
  const [ia, setIa] = useState<EtatIA>({ etape: "repos" });

  const questions = questionsDe(categorie);
  const brouillon = rediger(categorie, reponses);
  const texteDescription = automatique ? brouillon : description;

  const suivrePhotos = useCallback((chemins: string[], envoiEnCours: number) => setPhotos({ chemins, envoiEnCours }), []);

  function repondre(cle: string, valeur: string) {
    setReponses((r) => ({ ...r, [cle]: valeur }));
  }

  async function remplirAvecIA() {
    setIa({ etape: "analyse" });
    try {
      const reponse = await fetch("/api/ia/annonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titre, categorie, photos: photos.chemins }),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) {
        setIa({ etape: "erreur", message: donnees.erreur ?? "L'analyse n'a pas abouti. Réessayez dans un instant." });
        return;
      }

      const nouvelleCategorie: string = donnees.categorie || categorie;
      setCategorie(nouvelleCategorie);
      // Les réponses déjà données par le vendeur (valables pour la catégorie) priment sur celles de l'IA
      setReponses((r) => ({ ...donnees.caracteristiques, ...nettoyerReponses(nouvelleCategorie, r) }));
      // Titre vide ou trop court : remplacé ; sinon, proposé
      const remplacerTitre = Boolean(donnees.titre) && titre.trim().length < 5;
      if (remplacerTitre) setTitre(donnees.titre);
      const titreSuggere = !remplacerTitre && donnees.titre && donnees.titre !== titre.trim() ? donnees.titre : undefined;

      const ecritParLeVendeur = !automatique && description.trim() !== "" ? description : undefined;
      if (donnees.description) {
        setDescription(donnees.description);
        setAutomatique(false);
      }
      setIa({
        etape: "fini",
        reconnu: donnees.reconnu,
        sources: donnees.sources ?? [],
        titreSuggere,
        ancienneDescription: ecritParLeVendeur,
      });
    } catch {
      setIa({ etape: "erreur", message: "La connexion a été interrompue. Vérifiez votre réseau puis réessayez." });
    }
  }

  const peutAnalyser = (titre.trim().length >= 3 || photos.chemins.length > 0) && photos.envoiEnCours === 0;

  return (
    <form action={envoyer} className="grid gap-7" noValidate>
      <Message erreur={etat.erreur} />

      <ChoixPhotos idUtilisateur={idUtilisateur} initiales={initiales.photos} onChange={suivrePhotos} />

      <Champ
        id="titre"
        libelle="Titre"
        required
        minLength={5}
        maxLength={80}
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Ex. : Vélo de ville Peugeot, cadre 54"
      />

      {iaDisponible && (
        <div className="grid gap-3 rounded-carte border border-dashed border-prune/40 bg-ivoire p-4">
          <p className="flex items-start gap-3 text-sm text-mauve">
            <IconeEtincelle className="mt-0.5 size-5 shrink-0 text-prune" />
            Troqly retrouve l&apos;objet à partir du titre et des photos, puis remplit le questionnaire et la description.
          </p>
          <button
            type="button"
            onClick={remplirAvecIA}
            disabled={!peutAnalyser || ia.etape === "analyse"}
            className="bouton-contour justify-self-start text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ia.etape === "analyse" ? "Recherche de l'objet…" : "Remplir avec l'IA"}
          </button>
          <div aria-live="polite" className="grid gap-2 text-sm empty:hidden">
            {ia.etape === "analyse" && <p className="text-mauve">Cela prend en général 15 à 40 secondes.</p>}
            {!peutAnalyser && ia.etape === "repos" && (
              <p className="text-mauve">Ajoutez d&apos;abord un titre ou une photo.</p>
            )}
            {ia.etape === "erreur" && <p className="text-prune-nuit">{ia.message}</p>}
            {ia.etape === "fini" && (
              <>
                <p className="text-prune-nuit">
                  {ia.reconnu
                    ? "C'est rempli. Relisez chaque réponse et indiquez l'état et les défauts éventuels."
                    : "L'objet n'a pas été reconnu avec certitude : vérifiez bien chaque réponse."}
                </p>
                {ia.sources.length > 0 && (
                  <p className="text-mauve">
                    Sources :{" "}
                    {ia.sources.map((s, i) => (
                      <span key={s.url}>
                        {i > 0 && ", "}
                        <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-prune-nuit">
                          {s.site}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
                {ia.titreSuggere && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitre(ia.titreSuggere!);
                      setIa({ ...ia, titreSuggere: undefined });
                    }}
                    className="justify-self-start text-left font-semibold text-prune hover:underline"
                  >
                    Utiliser le titre « {ia.titreSuggere} »
                  </button>
                )}
                {ia.ancienneDescription && (
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(ia.ancienneDescription!);
                      setIa({ ...ia, ancienneDescription: undefined });
                    }}
                    className="justify-self-start font-semibold text-prune hover:underline"
                  >
                    Revenir à ma description
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid min-w-0 gap-1.5">
        <label htmlFor="categorie" className="text-sm font-semibold text-prune-nuit">
          Catégorie
        </label>
        <select
          id="categorie"
          name="categorie"
          required
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className={classeChamp}
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

      {questions.length > 0 && (
        <fieldset className="grid gap-5 rounded-carte border border-ligne p-4 sm:p-5">
          <legend className="px-1 font-titre text-[17px] font-semibold text-prune-nuit">Votre objet</legend>
          <p className="-mt-2 text-sm text-mauve">Chaque réponse complète la description. Seul l&apos;état est obligatoire.</p>
          {questions
            .filter((q) => q.type === "choix")
            .map((q) => (
              <QuestionObjet key={q.cle} question={q} valeur={reponses[q.cle] ?? ""} onChange={(valeur) => repondre(q.cle, valeur)} />
            ))}
          {/* Les réponses libres, courtes, vont par deux pour raccourcir le formulaire */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {questions
              .filter((q) => q.type === "texte")
              .map((q) => (
                <QuestionObjet key={q.cle} question={q} valeur={reponses[q.cle] ?? ""} onChange={(valeur) => repondre(q.cle, valeur)} />
              ))}
          </div>
        </fieldset>
      )}

      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <label htmlFor="description" className="text-sm font-semibold text-prune-nuit">
            Description
          </label>
          {!automatique && brouillon && description !== brouillon && (
            <button
              type="button"
              onClick={() => setAutomatique(true)}
              className="text-sm font-semibold text-prune hover:underline pointer-coarse:min-h-11"
            >
              Réécrire à partir des réponses
            </button>
          )}
        </div>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={4000}
          rows={6}
          value={texteDescription}
          onChange={(e) => {
            setDescription(e.target.value);
            setAutomatique(false);
          }}
          aria-describedby="description-aide"
          className={classeChamp}
        />
        <p id="description-aide" className="text-xs text-mauve">
          {automatique
            ? "Écrite à partir de vos réponses : complétez-la librement (défauts, raison de la vente…)."
            : "État, dimensions, défauts éventuels. Ne donnez pas votre numéro ni votre adresse."}
        </p>
      </div>

      <Champ id="prix" libelle="Prix (€)" inputMode="decimal" required defaultValue={v.prix} placeholder="Ex. : 25 ou 12,50" />

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Champ id="ville" libelle="Ville" autoComplete="address-level2" required maxLength={80} defaultValue={v.ville} />
        <Champ id="codePostal" libelle="Code postal" autoComplete="postal-code" inputMode="numeric" required maxLength={5} defaultValue={v.codePostal} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold text-prune-nuit">Remise de l&apos;objet</legend>
        <label className="flex min-h-11 items-center gap-3 text-prune-nuit">
          <input type="checkbox" name="mainPropre" defaultChecked={v.mainPropre} className="size-5 accent-[var(--action)]" />
          En main propre
        </label>
        <label className="flex min-h-11 items-center gap-3 text-prune-nuit">
          <input
            type="checkbox"
            name="livraison"
            checked={livraison}
            onChange={(e) => setLivraison(e.target.checked)}
            className="size-5 accent-[var(--action)]"
          />
          Livraison (frais d&apos;envoi payés par l&apos;acheteur)
        </label>
      </fieldset>

      {livraison && (
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="formatColis" className="text-sm font-semibold text-prune-nuit">
            Taille du colis
          </label>
          <select id="formatColis" name="formatColis" defaultValue={v.formatColis} aria-describedby="formatColis-aide" className={classeChamp}>
            <option value="">Choisissez une taille</option>
            {FORMATS_COLIS.map((f) => (
              <option key={f} value={f}>
                {libellesFormat[f]}
              </option>
            ))}
          </select>
          <p id="formatColis-aide" className="text-xs text-mauve">
            Elle fixe le prix d&apos;envoi proposé à l&apos;acheteur : Mondial Relay, Relais Colis, Colissimo ou Chronopost.
          </p>
        </div>
      )}

      <BoutonEnvoyer enCours="Enregistrement…">{libelleBouton}</BoutonEnvoyer>
    </form>
  );
}

// Une question du questionnaire : pastilles pour les choix courts, liste pour les longs, texte sinon
function QuestionObjet({ question: q, valeur, onChange }: { question: Question; valeur: string; onChange: (v: string) => void }) {
  const nom = `carac_${q.cle}`;
  if (q.type === "choix" && q.options.length <= 6) {
    return (
      <Pastilles
        nom={nom}
        legende={q.libelle}
        requis={q.cle === "etat"}
        options={q.options.map((o) => ({ valeur: o, libelle: o }))}
        valeur={valeur}
        onChange={onChange}
      />
    );
  }
  if (q.type === "choix") {
    return (
      <div className="grid min-w-0 gap-1.5">
        <label htmlFor={nom} className="text-sm font-semibold text-prune-nuit">
          {q.libelle}
        </label>
        <select id={nom} name={nom} value={valeur} onChange={(e) => onChange(e.target.value)} className={classeChamp}>
          <option value="">Non précisé</option>
          {q.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <Champ
      id={nom}
      libelle={q.libelle}
      maxLength={60}
      placeholder={q.exemple}
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
