# Design de Troqly

Direction « vitrine flottante » (refonte du 16/10/2026), d'après la référence « Shop — Style Reference » donnée par Ouva
et le skill `premium-3d-glass`. Elle remplace la direction « étiquette de vide-grenier » du 13/10/2026.
Ce fichier sert de référence à Claude Code et à Codex avant toute modification d'interface.

## Principes

- Les objets d'abord : la photo carrée porte l'annonce. L'interface reste achromatique, ce sont les photos qui apportent la couleur.
- Tout est doux : cartes à 28 px (`rounded-carte`), photos à 20 px dedans (`rounded-photo`), pilules pour les boutons, recherches, catégories et pastilles.
- Les cartes flottent par l'ombre seule (`carte` : surface blanche + double ombre douce), sans bordure, sur un fond gris très clair.
- Une seule couleur vive : la prune de Troqly (choisie par Ouva le 16/10/2026 à la place du violet de la référence). Elle sert au logo, au bouton principal et au bouton de recherche, dont l'ombre est teintée de prune (`shadow-action`). Ne pas ajouter de deuxième couleur vive.
- Le verre est réservé à ce qui flotte : barre du haut en pilule, barre d'onglets du téléphone, objet 3D de l'accueil.
- Coque façon Shop sur grand écran (v2, 16/10/2026, d'après la capture de Shop envoyée par Ouva) : rail d'icônes à gauche (`RailSite`, libellés en bulle au survol), la page posée dessus comme une grande feuille blanche à 28 px (`.coquille:has(.rail-site)` dans `globals.css`), pied de page en bande sombre arrondie dans la feuille. Le tableau de bord n'a pas de rail, donc pas de feuille.
- Pas de dégradé décoratif, pas d'illustration, pas de grille « icône + titre + texte », pas de surtitre.
- Rythme : 12 à 16 px entre les cartes, 64 à 80 px entre les grandes sections.
- Les frais sont montrés sur un exemple chiffré (encadré de l'accueil), calculé depuis `lib/frais.ts`.

## Thème clair et sombre

Les couleurs sont des variables CSS dans `src/app/globals.css`, déclinées trois fois : clair (`:root`),
sombre choisi (`[data-theme="dark"]`) et sombre du système (`prefers-color-scheme`).
Le bouton `ChoixTheme` enregistre le choix dans `localStorage` ; un petit script dans `layout.tsx`
l'applique avant l'affichage pour éviter un éclair de la mauvaise couleur.
Les noms des variables viennent de l'ancienne direction et sont gardés pour ne rien casser : lire la colonne « Rôle ».

| Rôle | Classe Tailwind | Clair | Sombre |
|---|---|---|---|
| Fond de page | `bg-ivoire` | #f2f4f5 | #0e0f10 |
| Surface (cartes, champs) | `bg-surface` | #ffffff | #18191b |
| Creux (fond des photos, puces) | `bg-creux` | #e8eaec | #232427 |
| Filets | `border-ligne` | #ebebeb | #2b2c2f |
| Bord des champs de saisie | automatique sur `input.border-ligne` | #a9a7a6 | #5c5a5a |
| Texte (encre) | `text-prune-nuit` | #0f0f10 | #f3f3f4 |
| Texte secondaire | `text-mauve` | #6b6867 | #a3a09f |
| Liens, marque | `text-prune` | #5a2a5a | #dcb0de |
| Action principale | `bg-action` / `text-sur-action` | #5a2a5a / blanc | #e2bde3 / #1a0f1b |
| Accent (focus, « Boostée ») | `text-abricot` | #7b3a7d | #e3a6e5 |
| Bande du pied de page | `bg-champ` / `text-sur-champ` | #111112 | #050506 |
| Pastille de prix | `etiquette` | blanc translucide, encre | idem |

Ombres : `shadow-carte` (double ombre douce des cartes), `shadow-douce` (pilules), `shadow-large` (survol, éléments qui flottent), `shadow-action` (bouton prune).

## Typographie

- Une seule famille partout : Hanken Grotesk (Google Fonts, servie par Next.js depuis le site), en 400, 500 et 600. Elle remplace GT Standard, payante. `font-titre` et `font-sans` pointent toutes deux dessus.
- La hiérarchie passe par la taille et l'approche, pas par le gras : jamais de 700. Texte 16 px à -0,011 em, titres serrés (-0,025 à -0,055 em selon la taille), libellés en 500.
- Rien sous 12 px, sauf les compteurs des badges.
- Chiffres des prix en `tabular-nums`.

## Composants

- `carte` (utilitaire CSS) : surface + rayon 28 + double ombre. À utiliser pour tout panneau (formulaires, encadrés, FAQ).
- `bouton` et `bouton-contour` : pilules de 44 px de haut, texte en 500. `pilule` : catégories, liens « tout voir », filtres.
- `bouton-clair` : pilule blanche de 48 px pour les fonds sombres (appel final de l'accueil), halo lilas qui s'allume au survol. Jamais sur fond clair.
- `etiquette` : pastille de prix posée en bas à gauche d'une photo. Sur une fiche d'annonce, le prix est un grand chiffre, pas une pastille.
- Champs de saisie : bord gris lisible ; au focus, il passe en prune et s'épaissit (`globals.css`). Le contour de focus du clavier reste pour les liens et boutons.
- `CarteAnnonce` : carte blanche avec 6 à 8 px de marge autour de la photo carrée, prix sur la photo, titre en 500, ville et date, modes de remise (masqués sur téléphone). Au survol, la carte monte de 2 px.
- `TitreSection` : titre de 22 à 26 px serré, lien « tout voir » en pilule avec chevron.
- `EnTete` : pilule de verre collée en haut, logo, recherche en pilule avec bouton rond prune, liens, thème, « Déposer une annonce ».
- `PiedDePage` : bande sombre avec colonnes de liens, puis le nom géant « troqly » en lilas (`NomGeant`) dont les lettres montent en rideau à son arrivée.
- `Pastilles` : choix unique en pastilles (genre, état, réponses courtes du questionnaire). Au-delà de 6 options, une liste déroulante.
- `Volet` : section repliable des pages de compte (titre et résumé visibles, formulaire à la demande).
- `BordureNeon` : réservée aux annonces boostées, autour de la photo de `CarteAnnonce`, toujours avec la mention « Boostée » (obligatoire quand un classement n'est pas seulement chronologique). D'après le composant Neon Border d'Originkit : une lumière prune vive fait le tour en 5 s, avec deux halos flous derrière et un trait net devant. Chaque carte part d'un point différent. Ne pas l'utiliser ailleurs.

## Accueil

(v2, 16/10/2026) De haut en bas : bandeau sombre « Déposez une annonce en deux minutes », vitrine `Vitrine`
(cartes et photos en perspective 3D qui suivent la souris, étiquette de verre au centre), grand lettrage « troqly »
en prune (`.lettrage`, le vrai titre reste pour les lecteurs d'écran), recherche, catégories en pilules avec une
pastille photo de la catégorie, rayons par catégorie (mosaïque 2 × 2 de photos dans une rangée qui défile avec
flèches rondes, `Defilement`), annonces boostées, dernières annonces, le manifeste et les trois étapes (scènes
légères, voir « Scènes immersives »), frais dans une grande carte sombre avec le ticket blanc incliné, FAQ, les
objections, puis l'appel final « Un placard qui déborde ? » sur une bande sombre animée par le champ d'anneau
(`ChampAnneau`, voir plus bas) avec un `bouton-clair` vers `/deposer`. Les scènes viennent après les annonces :
l'acheteur trouve d'abord la recherche et les objets.

- Vitrine : quatre vraies annonces (boostées d'abord) flottent en constellation autour d'une étiquette de prix en verre 3D, puis le titre centré, la recherche en pilule (quoi | où | bouton prune) et les catégories en pilules.
- `ObjetVerre` reprend le matériau du skill `premium-3d-glass` (verre en transmission totale, dispersion, irisation, studio de panneaux lumineux) sur une seule forme : une étiquette percée, devant le logo Troqly qu'elle réfracte. Three.js n'est chargé que sur l'accueil, au repos, après l'affichage. L'image n'est redessinée que pendant que l'étiquette s'incline (souris, téléphone penché), jamais en continu ; son flottement est une simple animation CSS (`flotte`) ; elle ne dessine rien hors écran ni en onglet caché, reste fixe si l'appareil demande moins d'animations, et n'apparaît pas sans WebGL 2. Le fond et la couleur du logo suivent le thème.
- Sur téléphone, la vitrine se resserre : deux cartes de part et d'autre de l'étiquette de verre (les deux vignettes sont masquées), puis le lettrage, la recherche et les catégories.
- Puis les annonces boostées, les dernières annonces, l'encadré des frais et la FAQ, chacun dans sa carte.
- Les grilles d'annonces passent de 2 colonnes à 4 dès 768 px, jamais 3 : une grille de 3 laisse une annonce seule sur sa ligne.

## Téléphone et tablette

- Moins de choses à l'écran : sous 640 px, la barre du haut ne garde que le logo et le thème ; Accueil, Rechercher, Déposer, Messages et Compte passent dans la barre d'onglets du bas (`NavigationMobile`, verre, coins hauts arrondis, onglet actif sur une pilule grise, zone sûre de l'iPhone respectée).
- Tablette (768 à 1023 px) : Messages et Mon compte deviennent des boutons ronds de 44 px avec leur icône (le nom reste lu par les lecteurs d'écran, le badge des non-lus passe sur l'icône), pour laisser la place à la recherche.
- Au doigt, tout ce qui se touche fait au moins 44 px de haut : `pilule`, `bouton` et `bouton-contour` grandissent sous `pointer: coarse`, et les petits liens isolés (pied de page, « Bloquer », « Supprimer mon compte »…) prennent `pointer-coarse:min-h-11`. Les liens au milieu d'une phrase restent tels quels.
- Les effets restent sur téléphone, adaptés : la vitrine et l'étiquette de verre suivent l'inclinaison du téléphone (Android ; l'iPhone demande une autorisation, il garde le flottement seul), le champ d'anneau se promène seul et se déplace au toucher. Rien en 3D quand le téléphone est en mode économie de données.
- Le `body` réserve la hauteur de cette barre en bas de page ; rien d'autre ne doit être fixé en bas de l'écran.
- Annonce : titre, prix et photos, puis l'encadré d'achat, puis les caractéristiques et la description.
- « Mon compte » est un sommaire : les raccourcis d'abord, les réglages repliés.

## Mouvement

(v2) Boutons : reflet clair en haut, ombre prune qui s'allume au survol, soulèvement de 1 px, enfoncement au clic, flèche `.fleche` qui glisse.
Pilules et cartes montent au survol. La vitrine arrive en cascade (`.arrivee`), les sections glissent en entrant
dans l'écran (`.revele`, animation liée au défilement, sans JavaScript ; ailleurs elles sont simplement visibles).

Transitions courtes (150 à 500 ms, courbe `ease-verre`), au survol et au clic.
Animations continues, toutes douces et coupées si l'appareil demande moins d'animations (`prefers-reduced-motion`) :
la lumière de `BordureNeon` (elle reste alors allumée sans bouger), le flottement des cartes de la constellation (`flotte`, 10 px sur 7 s),
le flottement et l'inclinaison de l'étiquette de verre (elle reste immobile), l'anneau des boutons (absent), les scènes de l'accueil
(texte plein, étapes en place, ovales tracés) et le champ d'anneau (une image fixe).

## Curseur et champ d'anneau

Deux composants d'Originkit (« Dot Cursor » et « Cursor Ring Field », ajoutés le 16/10/2026 à la demande d'Ouva),
refaits à la main d'après leur page car la commande `originkit add` ne passe pas depuis les fils dans le cloud, aux couleurs de Troqly.
Du « Dot Cursor », on ne garde que l'anneau : le 17/10/2026, Ouva n'a pas aimé le point qui remplaçait la flèche.

- `AnneauBouton` (tout le site sauf `/admin`) : la flèche normale du système reste. Au-dessus d'un bouton, d'une pastille ou d'un
  lien-icône, un anneau prune de 46 px apparaît autour d'elle et la suit avec un léger ressort, se resserre au clic, puis s'efface en
  quittant le bouton, au défilement ou hors de la fenêtre. Pas d'anneau sur les liens de texte ni sur les cartes. Lilas sur un bouton
  ou un fond sombre. Coupé au doigt, si l'appareil demande moins d'animations et en contraste élevé de Windows (`forced-colors`).
  `data-curseur="anneau"` force l'anneau sur un élément. C'est un seul petit élément déplacé par `transform`, qui ne calcule rien
  tant que la souris ne survole pas de bouton.
- `ChampAnneau` (appel final de l'accueil seulement) : des centaines de petits bâtonnets en WebGL ; un anneau de lumière suit la souris,
  les pousse et les allume en prune puis lilas. Sans souris, l'anneau se promène seul. Il s'arrête hors écran et en onglet caché, et sans
  WebGL la bande reste simplement sombre. Un voile sombre derrière le texte garde le contraste : ne jamais poser de texte long ni de
  formulaire dessus, et ne pas en mettre un deuxième sur la même page.

## Scènes immersives

D'après le skill `site-immersif-skill` (ajouté le 16/10/2026 à la demande d'Ouva). Le skill produit à l'origine un site
vitrine d'une page dont on ne doit pas toucher le moteur ; sur Troqly, on n'en reprend que les scènes, refaites en
composants React dans `src/components/immersif/`, avec le défilement normal du navigateur (pas de défilement détourné),
aux couleurs et à la typographie de Troqly.

Depuis le 17/10/2026, à la demande d'Ouva (« il y a trop de choses, allège »), le manifeste et les trois étapes sont des
sections légères, sans épinglage : leurs animations sont liées au défilement en CSS (`animation-timeline`), calculées par le
navigateur sans script ; le script ne fait que mesurer les ovales (`useTrait`, `scene.ts`). Seules les objections restent une
scène épinglée (section haute dont le contenu reste à l'écran, `position: sticky`, progression donnée par `useScene`).

- `Manifeste` : une seule phrase, « Chaque objet mérite une seconde vie, tout près de chez vous. », qui s'encre mot après mot en montant vers le milieu de l'écran ; un ovale tracé à la main entoure « tout près » quand l'encre l'atteint. Ne pas la rallonger.
- `Processus` : « Une annonce, [mosaïque de 4 photos d'annonces] trois étapes. » La petite mosaïque s'ouvre une fois entre les mots quand le titre arrive ; les trois étapes sont trois cartes (numéro prune 01, 02, 03, titre, une phrase) qui montent en entrant dans l'écran, de gauche à droite quand elles sont côte à côte ; l'appel « Déposer une annonce → » s'entoure d'un ovale en arrivant. Pas de rideau, de compteur ni de mosaïque plein écran : c'est ce qu'Ouva a trouvé trop chargé.
- `Objections` : « Pas d'abonnement. Pas de frais pour déposer. Pas d'appli à installer. Juste vous, et (votre prix.) » s'encrent une à une ; à la souris, une traînée de photos d'annonces surgit sous le pointeur puis s'efface.
- Cartes d'annonces de l'accueil (`grille-arrivee`) : elles arrivent décalées et penchées, puis se posent au fil du défilement (animation CSS liée au défilement, deux fois moins ample sur téléphone).
- En mouvement réduit, chaque scène devient une section simple : texte plein, ovales tracés, étapes en place, mosaïque ouverte dans la phrase, pas de traînée. Les navigateurs sans animations liées au défilement montrent la même chose.
- Ce qu'on ne reprend pas du modèle : l'écran de chargement (il retarde l'accès aux annonces), le témoignage client chiffré (pas de faux avis), la bande de devise, les photos de banques d'images (les visuels sont les photos des annonces).
- Les phrases des scènes doivent rester vraies : ne pas promettre ce que le site ne fait pas (par exemple une protection acheteur, qui n'existe pas).

## Performance

Ouva a trouvé le site lent le 17/10/2026. Mesuré sur un navigateur ralenti : l'étiquette de verre redessinée en continu
bloquait l'accueil, avant les flous répétés et le curseur. Règles qui en découlent :

- WebGL (`ObjetVerre`, `ChampAnneau`) : ne redessiner que ce qui bouge, s'arrêter hors écran et en onglet caché ; jamais de boucle qui tourne en continu pour une animation douce qu'une transformation CSS peut faire.
- Pas de `backdrop-filter` (flou d'arrière-plan) sur un élément répété (cartes, étiquettes de prix, vignettes) : un flou par carte ralentit tout le défilement. Il reste réservé à l'en-tête, à la barre d'onglets et aux fenêtres.
- Ne pas changer de variable CSS à chaque image sur un conteneur : tous ses enfants sont recalculés. Déplacer directement les éléments concernés (`transform`).
- Au défilement, préférer les animations CSS liées au défilement (`animation-timeline: view()`) ; ne rien mesurer (`getBoundingClientRect`, `elementFromPoint`) à chaque événement de défilement ; pas de nouvelle section épinglée de plusieurs écrans.
- Les pages sont calculées à Paris, à côté de la base Supabase : `web/vercel.json` fixe la région `cdg1`. Ne pas retirer ce réglage.

## Tableau de bord administrateur

`/admin` (réservé aux administrateurs) a sa propre coque (classe `coque-admin`, qui lui rend ses rayons de 18 px et son orange), sur le modèle choisi par Ouva le 15/10/2026 :
barre latérale d'icônes à gauche (ordinateur), onglets dans une pilule de verre en haut, contenu en cartes `rounded-carte`.
Ce sont les seules pages où l'on trouve des grilles de cartes chiffrées et un surtitre (« Administration · date ») :
c'est un outil de travail, pas une vitrine. Les règles de la vitrine ci-dessus ne s'y appliquent pas.

- `CarteChiffre` : pastille teintée, grand montant, précision. Teintes de `TEINTES` (prune, info, alerte, statut, abricot, neutre).
- Couleurs propres au tableau de bord : `info` (argent en cours, bleu) et `alerte` (litiges, rouge), déclinées en clair et en sombre.
- Graphiques en SVG dessinés côté serveur (`admin/graphiques.tsx`) : anneau « Où en est l'argent » avec sa légende en liens,
  barres des commissions sur 6 mois. Une seule série par graphique, étiquettes en couleur de texte, jamais en couleur de série.
- Toute grille qui contient du texte tronqué commence par `grid-cols-[minmax(0,1fr)]`, sinon la page déborde sur téléphone.

## Annonces de démonstration

`supabase/demo/annonces-demo.sql` vide les annonces et crée 6 boutiques fictives et 20 annonces, dont 4 boostées.
Leurs photos sont des dégradés sans objet, servis par le site depuis `public/demo` (chemins `demo/…`, voir `urlPhoto`).
`supabase/demo/retirer-demo.sql` les retire avant l'ouverture au public.

## Référencement

`metadata` avec gabarit de titre « … | Troqly », `robots.ts`, `sitemap.ts` (annonces visibles),
image de partage `opengraph-image.tsx`, données structurées `WebSite` sur l'accueil et `Product` sur chaque annonce.
Les pages privées (compte, messages, paiements) sont exclues de l'indexation.
