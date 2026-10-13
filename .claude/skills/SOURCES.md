# Skills design de Troqly

Les mêmes skills sont copiés à deux endroits :
- `.claude/skills/` pour Claude Code ;
- `.agents/skills/` pour Codex.

| Source | Commit | Skills | Licence |
|---|---|---|---|
| github.com/emilkowalski/skills | 2d22863 | animate, animate-expo, animation-performance, animation-vocabulary, apple-design, ask-sonner, break-ui, emil-design-eng, find-animation-opportunities, improve-animations, mobile-native, pick-ui-library, prototype, review-animations, write-swift | MIT |
| github.com/Leonxlnx/taste-skill | d237dd3 | brandkit, design-taste-frontend, design-taste-frontend-v1, full-output-enforcement, gpt-taste, high-end-visual-design, image-to-code, imagegen-frontend-mobile, imagegen-frontend-web, industrial-brutalist-ui, minimalist-ui, redesign-existing-projects, stitch-design-taste | MIT |
| github.com/pbakaus/impeccable | 245ad82 | impeccable (version Claude dans `.claude`, version Codex dans `.agents`) | Apache 2.0 |
| github.com/anthropics/skills | dbd4588 | canvas-design, brand-guidelines, theme-factory | voir LICENSE.txt |
| github.com/figma/mcp-server-guide | f049329 | figma-design-to-code (nouveau nom de figma-implement-design) | — |
| github.com/anthropics/claude-code | bf2323b | frontend-design | — |

Les dossiers portent le `name` déclaré dans chaque SKILL.md.

À garder en tête :
- `brand-guidelines` décrit la marque d'Anthropic, pas celle de Troqly : la direction artistique reste « Verre prune ».
- `figma-design-to-code` ne sert qu'avec le serveur MCP Figma connecté.
- `animate-expo`, `mobile-native` et `write-swift` visent les applis mobiles natives.

Pour mettre à jour un skill : recopier son dossier depuis la source dans les deux emplacements.
