-- Troqly : annonces boostées
-- À exécuter une fois dans Supabase > SQL Editor, après 20261013000000_boutiques_genre_caracteristiques.sql
-- et AVANT de fusionner le code qui affiche les annonces boostées (il lit cette colonne).

-- Une annonce est boostée tant que boost_jusqua est dans le futur : elle passe en tête de
-- l'accueil et de la recherche, avec une bordure néon et la mention « Boostée ».
-- Les membres peuvent la lire mais pas la modifier : pour l'instant, le boost se règle ici.
alter table public.annonces add column boost_jusqua timestamptz;

grant select (boost_jusqua) on public.annonces to anon, authenticated;

create index annonces_boostees on public.annonces (boost_jusqua desc) where boost_jusqua is not null;
