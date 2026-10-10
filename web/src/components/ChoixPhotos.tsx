"use client";

import { useRef, useState } from "react";
import { retirerPhotoNonPubliee } from "@/app/annonces/actions";
import { BUCKET_PHOTOS, PHOTOS_MAX, urlPhoto } from "@/lib/annonces";
import { creerClientNavigateur } from "@/lib/supabase/navigateur";

const COTE_MAX = 1600;
const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type Photo = { chemin: string; apercu: string };

// Réduit l'image à 1600 px et la convertit en WebP (ou JPEG si le navigateur ne sait pas)
async function preparerImage(fichier: File): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const versBlob = (type: string) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.82));
  const webp = await versBlob("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };
  const jpeg = await versBlob("image/jpeg");
  if (!jpeg) throw new Error("conversion");
  return { blob: jpeg, extension: "jpg" };
}

export function ChoixPhotos({ idUtilisateur, initiales = [] }: { idUtilisateur: string; initiales?: string[] }) {
  const [photos, setPhotos] = useState<Photo[]>(initiales.map((chemin) => ({ chemin, apercu: urlPhoto(chemin) })));
  const [envoiEnCours, setEnvoiEnCours] = useState(0);
  const [erreur, setErreur] = useState<string>();
  const champ = useRef<HTMLInputElement>(null);
  const publiees = useRef(new Set(initiales));

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur(undefined);
    const place = PHOTOS_MAX - photos.length - envoiEnCours;
    const choisis = Array.from(fichiers).slice(0, Math.max(0, place));
    if (fichiers.length > choisis.length) setErreur(`${PHOTOS_MAX} photos au maximum : les suivantes n'ont pas été ajoutées.`);

    const supabase = creerClientNavigateur();
    setEnvoiEnCours((n) => n + choisis.length);

    for (const fichier of choisis) {
      try {
        if (fichier.type && !TYPES_ACCEPTES.includes(fichier.type)) throw new Error("type");
        const { blob, extension } = await preparerImage(fichier);
        const chemin = `${idUtilisateur}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from(BUCKET_PHOTOS)
          .upload(chemin, blob, { contentType: blob.type, upsert: false });
        if (error) throw error;
        setPhotos((p) => [...p, { chemin, apercu: URL.createObjectURL(blob) }]);
      } catch {
        setErreur(`« ${fichier.name} » n'a pas pu être ajoutée. Utilisez une photo JPEG, PNG ou WebP.`);
      } finally {
        setEnvoiEnCours((n) => n - 1);
      }
    }
    if (champ.current) champ.current.value = "";
  }

  function retirer(chemin: string) {
    setPhotos((p) => p.filter((x) => x.chemin !== chemin));
    // Les photos déjà publiées sont supprimées à l'enregistrement de l'annonce
    if (!publiees.current.has(chemin)) void retirerPhotoNonPubliee(chemin);
  }

  function mettreEnPremier(chemin: string) {
    setPhotos((p) => [...p.filter((x) => x.chemin === chemin), ...p.filter((x) => x.chemin !== chemin)]);
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold text-prune-nuit">
        Photos <span className="font-normal text-mauve">({photos.length}/{PHOTOS_MAX})</span>
      </legend>

      {photos.map((p) => (
        <input key={p.chemin} type="hidden" name="photos" value={p.chemin} />
      ))}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.chemin} className="relative aspect-square overflow-hidden rounded-champ border border-ligne bg-ivoire">
            {/* Aperçu local ou public : next/image n'apporte rien ici */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.apercu} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 ? (
              <span className="verre-fort absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-prune-nuit">
                Principale
              </span>
            ) : (
              <button
                type="button"
                onClick={() => mettreEnPremier(p.chemin)}
                className="verre-fort absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-prune-nuit"
              >
                Mettre en premier
              </button>
            )}
            <button
              type="button"
              onClick={() => retirer(p.chemin)}
              aria-label={`Retirer la photo ${i + 1}`}
              className="verre-fort absolute top-2 right-2 grid size-8 place-items-center rounded-full text-lg leading-none text-prune-nuit"
            >
              ×
            </button>
          </li>
        ))}
        {Array.from({ length: envoiEnCours }, (_, i) => (
          <li
            key={`envoi-${i}`}
            className="grid aspect-square place-items-center rounded-champ border border-dashed border-ligne text-xs text-mauve"
          >
            Envoi…
          </li>
        ))}
        {photos.length + envoiEnCours < PHOTOS_MAX && (
          <li>
            <label
              htmlFor="ajout-photos"
              className="grid aspect-square cursor-pointer place-items-center rounded-champ border border-dashed border-prune text-center text-sm font-semibold text-prune transition-colors duration-200 hover:bg-ivoire"
            >
              + Ajouter
            </label>
            <input
              ref={champ}
              id="ajout-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(e) => ajouter(e.target.files)}
            />
          </li>
        )}
      </ul>

      <p className="text-xs text-mauve">La première photo apparaît dans les résultats. Les images sont réduites avant l&apos;envoi.</p>
      {erreur && (
        <p role="alert" className="text-sm text-prune-nuit">
          {erreur}
        </p>
      )}
      {envoiEnCours > 0 && <input type="hidden" name="envoiEnCours" value="1" />}
    </fieldset>
  );
}
