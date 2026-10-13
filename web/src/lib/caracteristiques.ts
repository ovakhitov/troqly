// Questionnaire par catégorie : les réponses décrivent l'objet (état, marque, taille…),
// s'affichent sur l'annonce et rédigent un premier jet de la description.

export type Question =
  | { cle: string; libelle: string; type: "choix"; options: readonly string[] }
  | { cle: string; libelle: string; type: "texte"; exemple: string };

export type Reponses = Record<string, string>;

const TEXTE_MAX = 60;

const ETAT_MODE: Question = {
  cle: "etat",
  libelle: "État",
  type: "choix",
  options: ["Neuf avec étiquette", "Neuf sans étiquette", "Très bon état", "Bon état", "Satisfaisant"],
};

const ETAT_OBJET: Question = {
  cle: "etat",
  libelle: "État",
  type: "choix",
  options: ["Neuf, dans son emballage", "Comme neuf", "Très bon état", "Bon état", "Satisfaisant", "Pour pièces ou à réparer"],
};

const type = (options: string[]): Question => ({ cle: "type", libelle: "Type", type: "choix", options: [...options, "Autre"] });
const marque: Question = { cle: "marque", libelle: "Marque", type: "texte", exemple: "Ex. : Zara, Ikea, Bosch" };
const modele: Question = { cle: "modele", libelle: "Modèle", type: "texte", exemple: "Ex. : iPhone 13, PS5, Kallax" };
const couleur: Question = { cle: "couleur", libelle: "Couleur", type: "texte", exemple: "Ex. : bleu marine" };
const matiere: Question = { cle: "matiere", libelle: "Matière", type: "texte", exemple: "Ex. : coton, chêne massif" };
const dimensions: Question = { cle: "dimensions", libelle: "Dimensions", type: "texte", exemple: "Ex. : 120 × 60 × 75 cm" };
const accessoires: Question = { cle: "accessoires", libelle: "Fourni avec", type: "texte", exemple: "Ex. : chargeur, boîte, facture" };

export const QUESTIONS: Record<string, Question[]> = {
  mode: [
    ETAT_MODE,
    type(["Robe", "Jupe", "Haut", "Pull", "Chemise", "Pantalon", "Jean", "Short", "Veste", "Manteau", "Chaussures", "Sac", "Bijou", "Accessoire"]),
    { cle: "pour", libelle: "Pour", type: "choix", options: ["Femme", "Homme", "Mixte"] },
    { cle: "taille", libelle: "Taille", type: "texte", exemple: "Ex. : 38, M, 42" },
    marque,
    couleur,
    matiere,
  ],
  maison: [
    ETAT_OBJET,
    type(["Meuble", "Canapé", "Fauteuil", "Table", "Chaise", "Rangement", "Luminaire", "Décoration", "Linge de maison", "Vaisselle", "Ustensile de cuisine", "Mobilier de jardin"]),
    marque,
    matiere,
    couleur,
    dimensions,
  ],
  multimedia: [
    ETAT_OBJET,
    type(["Smartphone", "Ordinateur portable", "Ordinateur de bureau", "Tablette", "Console", "Jeu vidéo", "Télévision", "Casque audio", "Enceinte", "Appareil photo", "Montre connectée", "Accessoire"]),
    marque,
    modele,
    { cle: "stockage", libelle: "Stockage", type: "texte", exemple: "Ex. : 128 Go" },
    couleur,
    accessoires,
  ],
  electromenager: [
    ETAT_OBJET,
    type(["Lave-linge", "Sèche-linge", "Lave-vaisselle", "Réfrigérateur", "Congélateur", "Four", "Micro-ondes", "Plaque de cuisson", "Aspirateur", "Cafetière", "Robot de cuisine", "Petit électroménager"]),
    marque,
    modele,
    dimensions,
    couleur,
  ],
  velos: [
    ETAT_OBJET,
    type(["Vélo de ville", "VTT", "Vélo de route", "Vélo électrique", "Vélo enfant", "Vélo pliant", "Trottinette", "Accessoire vélo"]),
    marque,
    { cle: "cadre", libelle: "Taille du cadre", type: "texte", exemple: "Ex. : 54 cm, M" },
    { cle: "roues", libelle: "Roues", type: "texte", exemple: "Ex. : 28 pouces" },
    { cle: "vitesses", libelle: "Vitesses", type: "texte", exemple: "Ex. : 21" },
    couleur,
  ],
  enfants: [
    ETAT_OBJET,
    type(["Vêtement", "Chaussures", "Jouet", "Jeu", "Livre", "Poussette", "Siège auto", "Lit", "Puériculture"]),
    { cle: "pour", libelle: "Pour", type: "choix", options: ["Fille", "Garçon", "Mixte"] },
    { cle: "age", libelle: "Âge ou taille", type: "texte", exemple: "Ex. : 3 ans, 6-12 mois" },
    marque,
    couleur,
  ],
  loisirs: [
    ETAT_OBJET,
    type(["Livre", "Bande dessinée", "Manga", "Vinyle", "CD", "Film", "Jeu de société", "Puzzle", "Instrument de musique", "Objet de collection", "Matériel créatif"]),
    { cle: "marque", libelle: "Marque, auteur ou artiste", type: "texte", exemple: "Ex. : Hergé, Yamaha" },
    { cle: "modele", libelle: "Titre ou modèle", type: "texte", exemple: "Ex. : Tintin au Tibet" },
    { cle: "langue", libelle: "Langue", type: "texte", exemple: "Ex. : français" },
  ],
  sport: [
    ETAT_OBJET,
    type(["Vêtement de sport", "Chaussures de sport", "Matériel de musculation", "Vélo d'appartement", "Raquette", "Ballon", "Ski", "Snowboard", "Surf", "Matériel de camping", "Matériel de randonnée"]),
    marque,
    { cle: "taille", libelle: "Taille", type: "texte", exemple: "Ex. : 42, L, 160 cm" },
    couleur,
  ],
  bricolage: [
    ETAT_OBJET,
    type(["Perceuse", "Visseuse", "Scie", "Ponceuse", "Outil à main", "Échelle", "Tondeuse", "Taille-haie", "Outil de jardin", "Matériaux", "Quincaillerie"]),
    marque,
    modele,
    { cle: "alimentation", libelle: "Alimentation", type: "choix", options: ["Secteur", "Batterie", "Thermique", "Manuelle"] },
    accessoires,
  ],
  autres: [ETAT_OBJET, marque, modele, couleur, dimensions],
};

export function questionsDe(categorie: string): Question[] {
  return QUESTIONS[categorie] ?? [];
}

// Toutes les clés possibles, pour le schéma de la réponse de l'IA
export const CLES_CARACTERISTIQUES = [...new Set(Object.values(QUESTIONS).flat().map((q) => q.cle))];

// Ne garde que les réponses prévues pour la catégorie, et seulement des valeurs proposées
export function nettoyerReponses(categorie: string, brutes: Record<string, unknown>): Reponses {
  const propres: Reponses = {};
  for (const q of questionsDe(categorie)) {
    const v = brutes[q.cle];
    if (typeof v !== "string") continue;
    const valeur = v.replace(/\s+/g, " ").trim().slice(0, TEXTE_MAX);
    if (!valeur) continue;
    if (q.type === "choix" && !q.options.includes(valeur)) continue;
    propres[q.cle] = valeur;
  }
  return propres;
}

export function lireReponses(formData: FormData, categorie: string): Reponses {
  const brutes: Record<string, unknown> = {};
  for (const [cle, v] of formData.entries()) {
    if (cle.startsWith("carac_")) brutes[cle.slice(6)] = v;
  }
  return nettoyerReponses(categorie, brutes);
}

// Réponses affichées sur l'annonce, dans l'ordre du questionnaire
export function lignesCaracteristiques(categorie: string, reponses: unknown): { libelle: string; valeur: string }[] {
  if (!reponses || typeof reponses !== "object") return [];
  const propres = nettoyerReponses(categorie, reponses as Record<string, unknown>);
  return questionsDe(categorie)
    .filter((q) => propres[q.cle] && !(q.cle === "type" && propres[q.cle] === "Autre"))
    .map((q) => ({ libelle: q.libelle, valeur: propres[q.cle] }));
}

// Premier jet de la description, réécrit à chaque réponse tant que le vendeur n'y touche pas.
// Ex. : « Robe Zara pour femme, taille 38, très bon état. » puis une ligne par autre précision.
const DANS_LA_PHRASE = new Set(["etat", "type", "marque", "modele", "pour", "taille", "age"]);

export function rediger(categorie: string, reponses: Reponses): string {
  // Les réponses d'une autre catégorie (choisie avant) ne comptent pas
  const r = nettoyerReponses(categorie, reponses);
  const nom = [r.type && r.type !== "Autre" ? r.type : "", r.marque ?? "", r.modele ?? ""].filter(Boolean).join(" ");
  const complements = [
    r.pour ? (r.pour === "Mixte" ? "mixte" : `pour ${r.pour.toLowerCase()}`) : "",
  ].filter(Boolean);
  const precisions = [r.taille ? `taille ${r.taille}` : "", r.age ?? "", r.etat ? r.etat.toLowerCase() : ""].filter(Boolean);

  const lignes: string[] = [];
  if (nom) {
    lignes.push(`${[nom, ...complements].join(" ")}${precisions.length ? `, ${precisions.join(", ")}` : ""}.`);
  } else if (r.etat) {
    lignes.push(`${r.etat}.`);
  }

  for (const q of questionsDe(categorie)) {
    if (DANS_LA_PHRASE.has(q.cle) || !r[q.cle]) continue;
    lignes.push(`${q.libelle} : ${r[q.cle]}`);
  }
  return lignes.join("\n");
}

// Correspondance avec schema.org pour les données structurées de l'annonce
export function etatSchemaOrg(etat: string | undefined) {
  if (!etat) return "https://schema.org/UsedCondition";
  if (etat.startsWith("Neuf")) return "https://schema.org/NewCondition";
  if (etat.startsWith("Pour pièces")) return "https://schema.org/DamagedCondition";
  return "https://schema.org/UsedCondition";
}
