# Design de Troqly

Direction « étiquette de vide-grenier » (refonte du 13/10/2026). Le prune reste la couleur de marque.
Ce fichier sert de référence à Claude Code et à Codex avant toute modification d'interface.

## Principes

- Les objets d'abord : la photo porte l'annonce, sans cadre ni bordure autour. Seule exception : les annonces « À la une » (voir `BordureNeon`).
- Les prix sont écrits sur une étiquette de papier (`etiquette`) : bout taillé, trou de ficelle, légèrement inclinée.
- Un seul grand aplat prune (`bg-champ`) : le haut de l'accueil et le pied de page.
- Le verre (Liquid Glass) est réservé à ce qui flotte : barre du haut sur les pages intérieures, recherche de l'accueil.
- Pas de grilles de cartes « icône + titre + texte », pas de surtitre au-dessus des titres, pas de dégradé décoratif.
- Les frais sont montrés sur un exemple chiffré (le ticket de l'accueil), calculé depuis `lib/frais.ts`.

## Frais et boosts

- Le seul barème est `lib/frais.ts` (frais de service Troqly : 4,9 % du prix de l'article + 0,30 €, hors livraison) ; aucun taux écrit en dur dans un composant. Libellé toujours « Frais de service Troqly », jamais « protection acheteur ».
- Avant tout paiement, montrer séparément prix de l'article, frais de service et livraison.
- Prix et durées des boosts : `lib/boosts.ts` uniquement. Page de choix : `/annonces/[id]/booster`, avec les règles (`REGLES_BOOST`) affichées avant l'achat.

## Thème clair et sombre

Les couleurs sont des variables CSS dans `src/app/globals.css`, déclinées trois fois : clair (`:root`),
sombre choisi (`[data-theme="dark"]`) et sombre du système (`prefers-color-scheme`).
Le bouton `ChoixTheme` enregistre le choix dans `localStorage` ; un petit script dans `layout.tsx`
l'applique avant l'affichage pour éviter un éclair de la mauvaise couleur.
Le papier des étiquettes et du ticket reste clair dans les deux thèmes.

| Rôle | Classe Tailwind | Clair | Sombre |
|---|---|---|---|
| Fond de page | `bg-ivoire` | #f2f0f3 | #141016 |
| Surface (panneaux, champs) | `bg-surface` | #ffffff | #1d171f |
| Creux (fond des photos) | `bg-creux` | #e9e5ea | #262028 |
| Filets | `border-ligne` | #ddd6de | #372d39 |
| Texte | `text-prune-nuit` | #1f1421 | #f2eaf2 |
| Texte secondaire | `text-mauve` | #66566a | #b4a3b6 |
| Liens, marque | `text-prune` | #5a2a5a | #e4b9e4 |
| Action principale | `bg-action` / `text-sur-action` | #5a2a5a / blanc | #e7c3e8 / #1f1421 |
| Aplat de marque | `bg-champ` / `text-sur-champ` | #3b1840 | #29132d |
| Accent (focus, numéros) | `text-abricot` | #b8461f | #ff8a5b |
| Papier d'étiquette | `bg-papier` | #fffaf1 | #f4ecdf |

## Typographie

- Titres : General Sans 500/600 (`font-titre`), serrés (`tracking-tight`), équilibrés (`text-balance`).
- Texte courant : police du système (`font-sans`), aucune police à télécharger.
- Chiffres des prix en `tabular-nums`.

## Composants

- `bouton` et `bouton-contour` (utilitaires CSS) : hauteur 44 px, rayon 12 px.
- Champs de saisie : pas de contour orange au focus ; le bord passe en prune et s'épaissit (`globals.css`). Le contour orange reste pour les liens et boutons au clavier.
- Rayons : `rounded-champ` 12 px, `rounded-photo` 14 px, `rounded-carte` 18 px.
- `CarteAnnonce` : photo, étiquette de prix, titre, ville et date, modes de remise (masqués sur téléphone).
- `EnTete` (variante `surChamp` sur l'accueil), `PiedDePage`, `CadreCompte` pour les formulaires.
- `Pastilles` : choix unique en pastilles (genre, état, réponses courtes du questionnaire). Au-delà de 6 options, une liste déroulante.
- `Volet` : section repliable des pages de compte (titre et résumé visibles, formulaire à la demande).
- `BordureNeon` : réservée aux annonces « À la une » (boost payant ou mise en avant par l'équipe), autour de la photo de `CarteAnnonce`, toujours avec la mention « Sponsorisé » (obligatoire pour une mise en avant contre paiement, Code de la consommation L111-7). Une annonce réservée n'est plus mise en avant. D'après le composant Neon Border d'Originkit : une lumière abricot fait le tour en 5 s, avec deux halos flous derrière et un trait net devant. Chaque carte part d'un point différent. Ne pas l'utiliser ailleurs, sinon elle ne distingue plus rien.

## Téléphone

- Moins de choses à l'écran : sous 640 px, la barre du haut ne garde que le logo et le thème ; Accueil, Rechercher, Déposer, Messages et Compte passent dans la barre d'onglets du bas (`NavigationMobile`, verre opaque, zone sûre de l'iPhone respectée).
- Le `body` réserve la hauteur de cette barre en bas de page ; rien d'autre ne doit être fixé en bas de l'écran.
- Accueil : pas de grand titre ni d'accroche visibles (gardés pour les lecteurs d'écran et les moteurs), recherche sur une ligne (le lieu se choisit dans les filtres), catégories en une ligne qui défile.
- Annonce : titre, prix et photos, puis l'encadré d'achat, puis les caractéristiques et la description.
- « Mon compte » est un sommaire : les raccourcis d'abord, les réglages repliés.

## Mouvement

Transitions courtes (150 à 500 ms, courbe `ease-verre`), seulement au survol et au clic.
Seule animation continue : la lumière de `BordureNeon` (une rotation, calculée par la carte graphique).
Tout est neutralisé quand l'appareil demande moins d'animations (`prefers-reduced-motion`) : la bordure néon reste alors allumée, sans bouger.

## Tableau de bord administrateur

`/admin` (réservé aux administrateurs) a sa propre coque, sur le modèle choisi par Ouva le 15/10/2026 :
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
