# Installer Premium 3D Glass

Ce dossier est un skill Claude Code. Pour l'utiliser :

1. Décompressez l'archive.
2. Placez le dossier `premium-3d-glass` dans `~/.claude/skills/`
   (créez le dossier `skills` s'il n'existe pas).
3. Ouvrez Claude Code et lancez `/premium-3d-glass`, ou demandez simplement
   « fais-moi un site vitrine 3D pour mon entreprise ».

Claude affiche alors deux formulaires (les infos : nom, secteur, activité, e-mail ; puis le
logo ou la forme 3D, et les couleurs), rédige le contenu, génère le site et le vérifie dans
un navigateur.

## Sans Claude

Le dossier `template/` est un site complet et autonome :

```sh
cd template
python3 tools/build_site.py site.example.json --out ../mon-site
cd ../mon-site && python3 serve.py
```

Éditez `site.example.json` avec vos textes, vos formes et vos couleurs, puis relancez
la commande. `template/README.md` détaille tout ce qui se règle.

## Prérequis

Python 3 et un navigateur qui gère WebGL 2. Aucune installation, aucune dépendance,
aucune connexion réseau.
