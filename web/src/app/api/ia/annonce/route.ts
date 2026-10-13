import { z } from "zod";
import { urlPhoto } from "@/lib/annonces";
import { analyserObjet, ErreurAnalyse, iaConfiguree } from "@/lib/ia";
import { creerClientServeur } from "@/lib/supabase/serveur";

// La recherche web et l'analyse des photos prennent souvent 15 à 40 secondes
export const maxDuration = 60;

const MESSAGES = {
  connexion: "Reconnectez-vous pour utiliser l'aide à la rédaction.",
  vide: "Ajoutez un titre ou au moins une photo, puis réessayez.",
  interdit: "Complétez votre compte et nommez votre boutique pour utiliser l'aide à la rédaction.",
  limite_membre: "Vous avez utilisé vos 10 analyses du jour. Vous pouvez remplir le formulaire vous-même, ou réessayer demain.",
  limite_site: "L'aide à la rédaction est très demandée aujourd'hui. Remplissez le formulaire vous-même, ou réessayez demain.",
  refus: "Cet objet n'a pas pu être analysé. Remplissez le formulaire vous-même.",
  incomplet: "L'objet n'a pas pu être reconnu. Précisez le titre (marque, modèle) ou ajoutez une photo plus nette.",
  sature: "Le service d'analyse est saturé. Réessayez dans une minute.",
  delai: "L'analyse a pris trop de temps. Réessayez, ou remplissez le formulaire vous-même.",
  indisponible: "L'aide à la rédaction est indisponible pour le moment.",
} as const;

const erreur = (cle: keyof typeof MESSAGES, statut: number) => Response.json({ erreur: MESSAGES[cle] }, { status: statut });

const schemaDemande = z.object({
  titre: z.string().max(200).default(""),
  categorie: z.string().max(40).default(""),
  photos: z.array(z.string().max(200)).max(8).default([]),
});

export async function POST(requete: Request) {
  if (!iaConfiguree()) return erreur("indisponible", 503);

  const supabase = await creerClientServeur();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return erreur("connexion", 401);

  const demande = schemaDemande.safeParse(await requete.json().catch(() => null));
  if (!demande.success) return erreur("vide", 400);
  const titre = demande.data.titre.replace(/\s+/g, " ").trim().slice(0, 80);
  // Uniquement les photos de ce membre, déjà envoyées dans le stockage public
  const chemin = new RegExp(`^${id}/[0-9a-f-]{36}\\.(webp|jpg|png)$`);
  const photos = demande.data.photos.filter((p) => chemin.test(p)).map(urlPhoto);
  if (titre.length < 3 && photos.length === 0) return erreur("vide", 400);

  // Plafond quotidien, vérifié et compté par la base
  const { data: reservation } = await supabase.rpc("reserver_analyse_ia");
  if (reservation === "interdit") return erreur("interdit", 403);
  if (reservation === "limite_membre" || reservation === "limite_site") return erreur(reservation, 429);
  if (reservation !== "ok") return erreur("indisponible", 503);

  const { data: categories } = await supabase.from("categories").select("slug, libelle").order("ordre");

  try {
    const resultat = await analyserObjet({
      titre,
      categorieActuelle: demande.data.categorie,
      photos,
      categories: categories ?? [],
    });
    return Response.json(resultat);
  } catch (e) {
    if (e instanceof ErreurAnalyse) return erreur(e.raison, e.raison === "sature" ? 503 : 502);
    console.error("Analyse IA impossible", e);
    return erreur("indisponible", 500);
  }
}
