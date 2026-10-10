"use client";

import { useRef, useState } from "react";
import { retirerPhotoNonPubliee } from "@/app/annonces/actions";
import { BUCKET_PHOTOS, PHOTOS_MAX, urlPhoto } from "@/lib/annonces";
import { creerClientNavigateur } from "@/lib/supabase/navigateur";

const COTE_MAX = 1600;
// Le type annoncé varie selon l'appareil (image/jpg, image/pjpeg…) : on se fie d'abord à l'extension,
// puis au décodage réel de l'image par le navigateur
const EXTENSIONS = /\.(jpe?g|jfif|png|webp|heic|heif)$/i;

type Photo = { chemin: string; apercu: string };

// crypto.randomUUID n'existe qu'en HTTPS ou sur localhost : depuis un téléphone sur le réseau
// local (http://192.168…), on fabrique l'identifiant avec getRandomValues, disponible partout
function identifiant() {
  if (typeof crypto.randomUUID === "function" && window.isSecureContext) return crypto.randomUUID();
  const o = crypto.getRandomValues(new Uint8Array(16));
  o[6] = (o[6] & 0x0f) | 0x40;
  o[8] = (o[8] & 0x3f) | 0x80;
  const h = Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

class ErreurPhoto extends Error {
  constructor(public raison: "format" | "envoi") {
    super(raison);
  }
}

// Décode l'image : createImageBitmap, ou à défaut une balise <img> (plus tolérante selon les navigateurs)
async function decoder(fichier: File): Promise<{ source: CanvasImageSource; largeur: number; hauteur: number; liberer: () => void }> {
  try {
    const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    return { source: bitmap, largeur: bitmap.width, hauteur: bitmap.height, liberer: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new ErreurPhoto("format");
    }
    return { source: img, largeur: img.naturalWidth, hauteur: img.naturalHeight, liberer: () => URL.revokeObjectURL(url) };
  }
}

// Réduit l'image à 1600 px et la convertit en WebP (ou JPEG si le navigateur ne sait pas)
async function preparerImage(fichier: File): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const image = await decoder(fichier);
  const echelle = Math.min(1, COTE_MAX / Math.max(image.largeur, image.hauteur));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.largeur * echelle);
  canvas.height = Math.round(image.hauteur * echelle);
  canvas.getContext("2d")!.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  image.liberer();

  const versBlob = (type: string) =>
    new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.82));
  const webp = await versBlob("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };
  const jpeg = await versBlob("image/jpeg");
  if (!jpeg) throw new ErreurPhoto("format");
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
        if (!fichier.type.startsWith("image/") && !EXTENSIONS.test(fichier.name)) throw new ErreurPhoto("format");
        const { blob, extension } = await preparerImage(fichier);
        const chemin = `${idUtilisateur}/${identifiant()}.${extension}`;
        const { error } = await supabase.storage
          .from(BUCKET_PHOTOS)
          .upload(chemin, blob, { contentType: blob.type, upsert: false });
        if (error) {
          console.error("Envoi de la photo refusé :", error.message);
          throw new ErreurPhoto("envoi");
        }
        setPhotos((p) => [...p, { chemin, apercu: URL.createObjectURL(blob) }]);
      } catch (e) {
        console.error("Photo non ajoutée :", fichier.name, fichier.type, e);
        setErreur(
          e instanceof ErreurPhoto && e.raison === "envoi"
            ? `« ${fichier.name} » n'a pas pu être envoyée. Vérifiez votre connexion, reconnectez-vous puis réessayez.`
            : `« ${fichier.name} » n'a pas pu être lue par votre navigateur. Essayez une autre photo, ou enregistrez-la en JPEG.`,
        );
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
                aria-label={`Faire de la photo ${i + 1} la photo principale`}
                className="verre-fort absolute right-2 bottom-2 left-2 min-h-11 rounded-full px-3 text-xs font-semibold text-prune-nuit"
              >
                Mettre en premier
              </button>
            )}
            <button
              type="button"
              onClick={() => retirer(p.chemin)}
              aria-label={`Retirer la photo ${i + 1}`}
              className="verre-fort absolute top-2 right-2 grid size-11 place-items-center rounded-full text-xl leading-none text-prune-nuit"
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
            {/* Le champ précède l'étiquette pour que son focus clavier soit visible sur celle-ci */}
            <input
              ref={champ}
              id="ajout-photos"
              type="file"
              accept="image/*,.jpg,.jpeg,.jfif,.png,.webp,.heic,.heif"
              multiple
              className="peer sr-only"
              onChange={(e) => ajouter(e.target.files)}
            />
            <label
              htmlFor="ajout-photos"
              className="grid aspect-square cursor-pointer place-items-center rounded-champ border border-dashed border-prune text-center text-sm font-semibold text-prune transition-colors duration-200 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-abricot hover:bg-ivoire"
            >
              + Ajouter des photos
            </label>
          </li>
        )}
      </ul>

      <p className="text-xs text-mauve">La première photo apparaît dans les résultats. Les images sont réduites avant l&apos;envoi.</p>
      <p aria-live="polite" className="sr-only">
        {envoiEnCours > 0
          ? `Envoi de ${envoiEnCours} photo${envoiEnCours > 1 ? "s" : ""} en cours.`
          : `${photos.length} photo${photos.length > 1 ? "s" : ""} sur ${PHOTOS_MAX}.`}
      </p>
      {erreur && (
        <p role="alert" className="text-sm text-prune-nuit">
          {erreur}
        </p>
      )}
      {envoiEnCours > 0 && <input type="hidden" name="envoiEnCours" value="1" />}
    </fieldset>
  );
}
