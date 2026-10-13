-- Troqly : genre, boutiques, pseudo unique, caractéristiques des annonces et analyse par IA
-- À exécuter une fois dans Supabase > SQL Editor, après les migrations du 10 octobre.

-- Genre ----------------------------------------------------------------------
-- Privé, comme le nom et la date de naissance. Exigé avant de vendre ou d'acheter.

create type public.genre as enum ('femme', 'homme', 'autre');

alter table public.informations_privees add column genre public.genre;

grant select (genre), insert (genre), update (genre) on public.informations_privees to authenticated;

-- Pseudo unique, sans tenir compte des majuscules ------------------------------
-- Les doublons déjà présents reçoivent un suffixe ; le plus ancien garde son pseudo.

update public.profils p
set pseudo = left(p.pseudo, 25) || '-' || substr(p.id::text, 1, 4)
where exists (
  select 1 from public.profils q
  where lower(q.pseudo) = lower(p.pseudo) and (q.cree_le, q.id) < (p.cree_le, p.id)
);

create unique index profils_pseudo_unique on public.profils (lower(pseudo));

-- Le site vérifie le pseudo avant l'inscription ; s'il a été pris entre-temps,
-- le compte est créé quand même, avec un suffixe modifiable dans « Mon compte »
create or replace function public.creer_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pseudo text := trim(coalesce(new.raw_user_meta_data ->> 'pseudo', ''));
begin
  if char_length(v_pseudo) not between 3 and 30 then
    v_pseudo := 'membre-' || substr(new.id::text, 1, 8);
  end if;
  if exists (select 1 from public.profils where lower(pseudo) = lower(v_pseudo)) then
    v_pseudo := left(v_pseudo, 25) || '-' || substr(new.id::text, 1, 4);
  end if;
  insert into public.profils (id, pseudo) values (new.id, v_pseudo);
  return new;
end;
$$;

-- Disponibilité d'un pseudo (le sien compte comme disponible)
create function public.pseudo_disponible(p_pseudo text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.profils
    where lower(pseudo) = lower(trim(p_pseudo)) and id is distinct from auth.uid()
  );
$$;

grant execute on function public.pseudo_disponible(text) to anon, authenticated;

-- Boutiques ------------------------------------------------------------------
-- Chaque membre vend sous le nom de sa boutique, obligatoire avant la première annonce.
-- L'adresse publique (/boutique/<slug>) est tirée du nom.

alter table public.profils
  add column boutique_nom text
    check (boutique_nom is null or char_length(boutique_nom) between 3 and 40),
  add column boutique_slug text
    check (boutique_slug is null or (boutique_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(boutique_slug) between 3 and 60)),
  add column boutique_description text
    check (boutique_description is null or char_length(boutique_description) <= 600),
  add constraint boutique_nom_et_adresse check ((boutique_nom is null) = (boutique_slug is null));

create unique index profils_boutique_nom_unique on public.profils (lower(boutique_nom));
create unique index profils_boutique_slug_unique on public.profils (boutique_slug);

grant select (boutique_nom, boutique_slug, boutique_description) on public.profils to anon, authenticated;
grant update (boutique_nom, boutique_slug, boutique_description) on public.profils to authenticated;

-- Acheter : informations personnelles complètes (genre compris) et compte non bloqué
create function public.peut_acheter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.informations_privees i where i.id = auth.uid() and i.genre is not null)
     and not exists (select 1 from public.profils p where p.id = auth.uid() and p.bloque);
$$;

revoke execute on function public.peut_acheter() from public, anon;
grant execute on function public.peut_acheter() to authenticated;

-- Vendre : la même chose, plus une boutique nommée.
-- La règle de dépôt des annonces s'appuie sur cette fonction.
create or replace function public.peut_publier()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.peut_acheter()
     and exists (select 1 from public.profils p where p.id = auth.uid() and p.boutique_nom is not null);
$$;

-- Caractéristiques des annonces -------------------------------------------------
-- Réponses au questionnaire de la catégorie (état, marque, taille…), affichées sur l'annonce.

alter table public.annonces
  add column caracteristiques jsonb not null default '{}'::jsonb
    constraint caracteristiques_objet
    check (jsonb_typeof(caracteristiques) = 'object' and octet_length(caracteristiques::text) <= 4000);

grant select (caracteristiques) on public.annonces to anon, authenticated;
grant insert (caracteristiques), update (caracteristiques) on public.annonces to authenticated;

-- Analyse des annonces par IA ---------------------------------------------------
-- Une ligne par analyse, pour plafonner le nombre d'appels (et donc la facture).

create table public.analyses_ia (
  id bigint generated always as identity primary key,
  membre uuid not null references auth.users (id) on delete cascade,
  cree_le timestamptz not null default now()
);

create index analyses_ia_membre on public.analyses_ia (membre, cree_le desc);
create index analyses_ia_date on public.analyses_ia (cree_le desc);

alter table public.analyses_ia enable row level security;
revoke select, insert, update, delete on public.analyses_ia from anon, authenticated;

-- 10 analyses par membre et 300 pour tout le site sur 24 heures glissantes.
-- Renvoie « ok », « limite_membre », « limite_site » ou « interdit ».
create function public.reserver_analyse_ia()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.peut_publier() then
    return 'interdit';
  end if;

  perform pg_advisory_xact_lock(hashtext('troqly_analyses_ia'));
  delete from public.analyses_ia where cree_le < now() - interval '2 days';

  if (select count(*) from public.analyses_ia
      where membre = auth.uid() and cree_le > now() - interval '1 day') >= 10 then
    return 'limite_membre';
  end if;
  if (select count(*) from public.analyses_ia where cree_le > now() - interval '1 day') >= 300 then
    return 'limite_site';
  end if;

  insert into public.analyses_ia (membre) values (auth.uid());
  return 'ok';
end;
$$;

revoke execute on function public.reserver_analyse_ia() from public, anon;
grant execute on function public.reserver_analyse_ia() to authenticated;
