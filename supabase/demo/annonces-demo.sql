-- Troqly : vider les annonces et mettre des annonces de démonstration
-- À exécuter dans Supabase > SQL Editor, APRÈS 20261013150000_annonces_boostees.sql
-- et après la mise en ligne du code (les photos de démonstration sont servies par le site, dans public/demo).
--
-- ATTENTION : ce script supprime TOUTES les annonces du site, avec leurs photos enregistrées,
-- favoris, conversations, offres et signalements. Les commandes déjà passées restent, sans lien vers l'annonce.
--
-- Il crée ensuite 6 vendeurs fictifs avec leur boutique et 20 annonces, dont 4 boostées pendant 30 jours.
-- Les vendeurs fictifs ont une adresse en @demo.troqly.invalid et aucun mot de passe : personne ne peut
-- se connecter à leur compte. Le script peut être relancé, il repart de zéro à chaque fois.
-- Pour tout retirer avant l'ouverture au public : supabase/demo/retirer-demo.sql.

begin;

delete from public.annonces;
delete from auth.users where email like '%@demo.troqly.invalid';

-- Vendeurs fictifs : le profil est créé par le déclencheur d'inscription, à partir du pseudo
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'le-grenier-de-lea@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "lea_chine"}', now() - interval '210 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'chez-marc@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "marc69"}', now() - interval '330 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'le-dressing-d-ines@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "ines.b"}', now() - interval '95 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'atelier-thomas@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "thomas_velo"}', now() - interval '400 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
   'la-malle-de-camille@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "camille_m"}', now() - interval '150 days', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated',
   'jules-collection@demo.troqly.invalid', '', now(), '{"provider":"email","providers":["email"]}',
   '{"pseudo": "jules.r"}', now() - interval '260 days', now(), '', '', '', '');

-- Ville et boutique de chaque vendeur
update public.profils p
set ville = d.ville, boutique_nom = d.nom, boutique_slug = d.adresse, boutique_description = d.description,
    cree_le = now() - d.anciennete
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'Lyon', 'Le Grenier de Léa', 'le-grenier-de-lea',
   'Déco, petits meubles et livres chinés. Remises à Lyon 3e le soir et le week-end.', interval '210 days'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'Villeurbanne', 'Chez Marc', 'chez-marc',
   'Électronique et outillage, tout est testé avant la vente.', interval '330 days'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'Paris', 'Le Dressing d''Inès', 'le-dressing-d-ines',
   'Mode femme et mixte, tailles 36 à 40. Envoi sous 48 h.', interval '95 days'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'Nantes', 'Atelier Thomas', 'atelier-thomas',
   'Vélos révisés à l''atelier et matériel de sport.', interval '400 days'),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 'Bordeaux', 'La Malle de Camille', 'la-malle-de-camille',
   'Affaires d''enfants, jeux et petit électroménager de la maison.', interval '150 days'),
  ('d0000000-0000-4000-8000-000000000006'::uuid, 'Lille', 'Jules Collection', 'jules-collection',
   'Vinyles, bandes dessinées et appareils photo argentiques.', interval '260 days')
) as d (id, ville, nom, adresse, description, anciennete)
where p.id = d.id;

-- Annonces : les 4 premières sont boostées pendant 30 jours
insert into public.annonces (id, vendeur, titre, description, prix_centimes, categorie, ville, code_postal,
                             main_propre, livraison, format_colis, statut, caracteristiques, cree_le, boost_jusqua)
values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'Vélo de ville Peugeot LC01, cadre 54',
   'Vélo de ville Peugeot LC01, révisé en septembre : freins, câbles et pneus changés. Cadre 54 cm, pour une taille de 1,70 m à 1,85 m. Garde-boue, porte-bagages et éclairage à dynamo.',
   18000, 'velos', 'Nantes', '44000', true, false, null, 'publiee',
   '{"etat": "Bon état", "type": "Vélo de ville", "marque": "Peugeot", "cadre": "54 cm", "roues": "28 pouces", "vitesses": "7", "couleur": "vert sapin"}',
   now() - interval '6 hours', now() + interval '30 days'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Fauteuil en rotin années 70',
   'Fauteuil en rotin des années 70, assise ronde et dossier haut. Structure solide, aucune casse dans le tressage. Coussin d''assise en lin écru fourni.',
   9500, 'maison', 'Lyon', '69003', true, false, null, 'publiee',
   '{"etat": "Très bon état", "type": "Fauteuil", "matiere": "rotin", "couleur": "naturel", "dimensions": "80 × 70 × 95 cm"}',
   now() - interval '20 hours', now() + interval '30 days'),
  ('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000006', 'Appareil photo Canon AE-1 et objectif 50 mm',
   'Canon AE-1 argentique avec objectif FD 50 mm f/1.8. Cellule et obturateur fonctionnels, pile neuve. Testé avec une pellicule en septembre, photos nettes. Sangle et bouchon d''objectif fournis.',
   22000, 'multimedia', 'Lille', '59000', true, true, 'petit', 'publiee',
   '{"etat": "Très bon état", "type": "Appareil photo", "marque": "Canon", "modele": "AE-1", "accessoires": "objectif 50 mm, sangle"}',
   now() - interval '30 hours', now() + interval '30 days'),
  ('a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'Veste en jean Levi''s Trucker, taille M',
   'Veste en jean Levi''s Trucker, bleu délavé, taille M. Portée quelques fois, aucun accroc ni tache.',
   3500, 'mode', 'Paris', '75011', true, true, 'petit', 'publiee',
   '{"etat": "Très bon état", "type": "Veste", "pour": "Mixte", "taille": "M", "marque": "Levi''s", "couleur": "bleu délavé", "matiere": "coton"}',
   now() - interval '3 hours', now() + interval '30 days'),
  ('a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'Robe Sézane taille 38',
   'Robe portefeuille Sézane, imprimé fleuri sur fond bleu marine, taille 38. Portée deux fois, comme neuve.',
   4500, 'mode', 'Paris', '75011', true, true, 'petit', 'reservee',
   '{"etat": "Très bon état", "type": "Robe", "pour": "Femme", "taille": "38", "marque": "Sézane", "couleur": "bleu marine"}',
   now() - interval '50 hours', null),
  ('a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'Baskets Veja V-10 blanches, pointure 39',
   'Baskets Veja V-10 en cuir blanc, pointure 39. Semelles peu usées, lavées et prêtes à porter. Boîte d''origine.',
   5500, 'mode', 'Paris', '75011', true, true, 'moyen', 'publiee',
   '{"etat": "Bon état", "type": "Chaussures", "pour": "Femme", "taille": "39", "marque": "Veja", "couleur": "blanc"}',
   now() - interval '72 hours', null),
  ('a0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000001', 'Lampe de bureau Anglepoise Type 75',
   'Lampe Anglepoise Type 75 noire, bras articulé et ressorts en parfait état. Ampoule LED fournie. Achetée il y a un an, peu servie.',
   6000, 'maison', 'Lyon', '69003', true, true, 'moyen', 'publiee',
   '{"etat": "Comme neuf", "type": "Luminaire", "marque": "Anglepoise", "couleur": "noir"}',
   now() - interval '26 hours', null),
  ('a0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000001', 'Table basse en chêne massif',
   'Table basse en chêne massif, plateau huilé, pieds fuselés. Quelques marques d''usage sur le plateau, rien de profond. À venir chercher à Lyon 3e : elle ne se démonte pas.',
   12000, 'maison', 'Lyon', '69003', true, false, null, 'publiee',
   '{"etat": "Bon état", "type": "Table", "matiere": "chêne massif", "dimensions": "110 × 60 × 40 cm"}',
   now() - interval '96 hours', null),
  ('a0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000002', 'Console Nintendo Switch OLED blanche',
   'Switch OLED blanche achetée en 2023, écran sans rayure (protection posée dès l''achat). Livrée avec le dock, les deux Joy-Con, le chargeur et la boîte.',
   21000, 'multimedia', 'Villeurbanne', '69100', true, true, 'moyen', 'publiee',
   '{"etat": "Très bon état", "type": "Console", "marque": "Nintendo", "modele": "Switch OLED", "stockage": "64 Go", "couleur": "blanc", "accessoires": "dock, Joy-Con, chargeur, boîte"}',
   now() - interval '10 hours', null),
  ('a0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000002', 'iPhone 13, 128 Go, minuit',
   'iPhone 13, 128 Go, coloris minuit, débloqué tout opérateur. Batterie à 86 %. Coque et verre trempé depuis le premier jour, aucune rayure visible.',
   39000, 'multimedia', 'Villeurbanne', '69100', true, true, 'petit', 'publiee',
   '{"etat": "Très bon état", "type": "Smartphone", "marque": "Apple", "modele": "iPhone 13", "stockage": "128 Go", "couleur": "minuit", "accessoires": "câble, boîte"}',
   now() - interval '40 hours', null),
  ('a0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000002', 'Perceuse visseuse Bosch 18 V, 2 batteries',
   'Perceuse visseuse sans fil Bosch 18 V, deux batteries 2 Ah et chargeur, dans sa mallette. Fonctionne parfaitement, vendue car j''en ai reçu une autre.',
   7000, 'bricolage', 'Villeurbanne', '69100', true, true, 'moyen', 'publiee',
   '{"etat": "Bon état", "type": "Perceuse", "marque": "Bosch", "alimentation": "Batterie", "accessoires": "2 batteries, chargeur, mallette"}',
   now() - interval '120 hours', null),
  ('a0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000005', 'Machine à café à grains De''Longhi Magnifica S',
   'Machine à café à grains De''Longhi Magnifica S, détartrée et nettoyée. Buse vapeur pour le lait, moulin réglable. Notice fournie.',
   15000, 'electromenager', 'Bordeaux', '33000', true, false, null, 'publiee',
   '{"etat": "Bon état", "type": "Cafetière", "marque": "De''Longhi", "modele": "Magnifica S", "couleur": "noir"}',
   now() - interval '60 hours', null),
  ('a0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000004', 'VTT Rockrider ST 520, taille M',
   'VTT semi-rigide Rockrider ST 520, taille M, roues 27,5 pouces, freins à disque. Révisé à l''atelier : transmission nettoyée, pneu avant neuf.',
   23000, 'velos', 'Nantes', '44000', true, false, null, 'publiee',
   '{"etat": "Bon état", "type": "VTT", "marque": "Rockrider", "cadre": "M", "roues": "27,5 pouces", "vitesses": "9", "couleur": "gris"}',
   now() - interval '80 hours', null),
  ('a0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000004', 'Raquette de tennis Babolat Pure Drive',
   'Raquette Babolat Pure Drive, grip 2, cordée il y a un mois. Housse fournie. Quelques traces sur le cadre, sans conséquence pour le jeu.',
   8500, 'sport', 'Nantes', '44000', true, true, 'moyen', 'publiee',
   '{"etat": "Bon état", "type": "Raquette", "marque": "Babolat", "taille": "grip 2", "couleur": "bleu"}',
   now() - interval '150 hours', null),
  ('a0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000005', 'Poussette Babyzen Yoyo² avec nacelle',
   'Poussette Babyzen Yoyo², cadre noir, avec la nacelle et le pack 6+. Se plie en quelques secondes et passe en cabine d''avion. Tissus lavés.',
   19000, 'enfants', 'Bordeaux', '33000', true, false, null, 'publiee',
   '{"etat": "Bon état", "type": "Poussette", "pour": "Mixte", "marque": "Babyzen", "couleur": "noir et gris"}',
   now() - interval '18 hours', null),
  ('a0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000005', 'Lot de 12 livres Petit Ours Brun',
   'Douze albums de Petit Ours Brun, couvertures en bon état, pages complètes. Idéal de 2 à 5 ans.',
   1500, 'enfants', 'Bordeaux', '33000', true, true, 'petit', 'publiee',
   '{"etat": "Bon état", "type": "Livre", "pour": "Mixte", "age": "2 à 5 ans", "marque": "Bayard"}',
   now() - interval '100 hours', null),
  ('a0000000-0000-4000-8000-000000000017', 'd0000000-0000-4000-8000-000000000005', 'Jeu de société Carcassonne complet',
   'Carcassonne, la boîte de base, complète : toutes les tuiles et les pions ont été recomptés. Règles en français.',
   1800, 'loisirs', 'Bordeaux', '33000', true, true, 'petit', 'publiee',
   '{"etat": "Très bon état", "type": "Jeu de société", "modele": "Carcassonne", "langue": "français"}',
   now() - interval '130 hours', null),
  ('a0000000-0000-4000-8000-000000000018', 'd0000000-0000-4000-8000-000000000006', 'Vinyle Daft Punk Discovery, double album',
   'Double vinyle Discovery de Daft Punk, pressage de 2001. Disques sans rayure, pochette légèrement marquée aux coins.',
   7000, 'loisirs', 'Lille', '59000', true, true, 'petit', 'publiee',
   '{"etat": "Très bon état", "type": "Vinyle", "marque": "Daft Punk", "modele": "Discovery"}',
   now() - interval '22 hours', null),
  ('a0000000-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000006', 'Lot de 8 albums Tintin',
   'Huit albums de Tintin en édition cartonnée récente, dont Le Lotus bleu, Tintin au Tibet et On a marché sur la Lune. Couvertures propres.',
   4800, 'loisirs', 'Lille', '59000', true, true, 'moyen', 'publiee',
   '{"etat": "Bon état", "type": "Bande dessinée", "marque": "Hergé", "langue": "français"}',
   now() - interval '55 hours', null),
  ('a0000000-0000-4000-8000-000000000020', 'd0000000-0000-4000-8000-000000000001', 'Lot de 5 livres de cuisine',
   'Cinq livres de cuisine : recettes du quotidien, pâtisserie et cuisine végétarienne. Quelques taches de cuisine, rien de gênant.',
   1500, 'loisirs', 'Lyon', '69003', true, true, 'moyen', 'publiee',
   '{"etat": "Bon état", "type": "Livre", "langue": "français"}',
   now() - interval '160 hours', null);

-- Photos : des dégradés sans objet, servis par le site (web/public/demo)
insert into public.photos_annonces (annonce, chemin, position)
values
  ('a0000000-0000-4000-8000-000000000001', 'demo/velo-peugeot-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000001', 'demo/velo-peugeot-2.webp', 1),
  ('a0000000-0000-4000-8000-000000000002', 'demo/fauteuil-rotin-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000002', 'demo/fauteuil-rotin-2.webp', 1),
  ('a0000000-0000-4000-8000-000000000003', 'demo/canon-ae1-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000003', 'demo/canon-ae1-2.webp', 1),
  ('a0000000-0000-4000-8000-000000000004', 'demo/veste-levis-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000004', 'demo/veste-levis-2.webp', 1),
  ('a0000000-0000-4000-8000-000000000005', 'demo/robe-sezane-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000006', 'demo/baskets-veja-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000007', 'demo/lampe-anglepoise-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000008', 'demo/table-chene-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000009', 'demo/switch-oled-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000010', 'demo/iphone-13-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000011', 'demo/perceuse-bosch-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000012', 'demo/cafetiere-delonghi-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000013', 'demo/vtt-rockrider-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000014', 'demo/raquette-babolat-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000015', 'demo/poussette-yoyo-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000016', 'demo/livres-petit-ours-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000017', 'demo/carcassonne-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000018', 'demo/vinyle-daft-punk-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000019', 'demo/bd-tintin-1.webp', 0),
  ('a0000000-0000-4000-8000-000000000020', 'demo/livres-cuisine-1.webp', 0);

commit;
