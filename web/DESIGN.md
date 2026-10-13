# Design de Troqly

Direction « étiquette de vide-grenier » (refonte du 13/10/2026). Le prune reste la couleur de marque.
Ce fichier sert de référence à Claude Code et à Codex avant toute modification d'interface.

## Principes

- Les objets d'abord : la photo porte l'annonce, sans cadre ni bordure autour.
- Les prix sont écrits sur une étiquette de papier (`etiquette`) : bout taillé, trou de ficelle, légèrement inclinée.
- Un seul grand aplat prune (`bg-champ`) : le haut de l'accueil et le pied de page.
- Le verre (Liquid Glass) est réservé à ce qui flotte : barre du haut sur les pages intérieures, recherche de l'accueil.
- Pas de grilles de cartes « icône + titre + texte », pas de surtitre au-dessus des titres, pas de dégradé décoratif.
- Les frais sont montrés sur un exemple chiffré (le ticket de l'accueil), calculé depuis `lib/frais.ts`.

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
- Rayons : `rounded-champ` 12 px, `rounded-photo` 14 px, `rounded-carte` 18 px.
- `CarteAnnonce` : photo, étiquette de prix, titre, ville et date, modes de remise (masqués sur téléphone).
- `EnTete` (variante `surChamp` sur l'accueil), `PiedDePage`, `CadreCompte` pour les formulaires.
- `Pastilles` : choix unique en pastilles (genre, état, réponses courtes du questionnaire). Au-delà de 6 options, une liste déroulante.
- `Volet` : section repliable des pages de compte (titre et résumé visibles, formulaire à la demande).

## Téléphone

- Moins de choses à l'écran : sous 640 px, la barre du haut ne garde que le logo et le thème ; Accueil, Rechercher, Déposer, Messages et Compte passent dans la barre d'onglets du bas (`NavigationMobile`, verre opaque, zone sûre de l'iPhone respectée).
- Le `body` réserve la hauteur de cette barre en bas de page ; rien d'autre ne doit être fixé en bas de l'écran.
- Accueil : titre plus court, recherche sur une ligne (le lieu se choisit dans les filtres), catégories en une ligne qui défile.
- Annonce : titre, prix et photos, puis l'encadré d'achat, puis les caractéristiques et la description.
- « Mon compte » est un sommaire : les raccourcis d'abord, les réglages repliés.

## Mouvement

Transitions courtes (150 à 500 ms, courbe `ease-verre`), seulement au survol et au clic.
Tout est neutralisé quand l'appareil demande moins d'animations (`prefers-reduced-motion`).

## Référencement

`metadata` avec gabarit de titre « … | Troqly », `robots.ts`, `sitemap.ts` (annonces visibles),
image de partage `opengraph-image.tsx`, données structurées `WebSite` sur l'accueil et `Product` sur chaque annonce.
Les pages privées (compte, messages, paiements) sont exclues de l'indexation.
