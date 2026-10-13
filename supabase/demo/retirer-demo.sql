-- Troqly : retirer les annonces de démonstration
-- À exécuter dans Supabase > SQL Editor avant d'ouvrir le site au public.
-- Supprime les 6 vendeurs fictifs (adresse en @demo.troqly.invalid), leur boutique et leurs annonces.
-- Les annonces des vrais membres ne sont pas touchées.

delete from auth.users where email like '%@demo.troqly.invalid';
