-- Troqly : catégories, annonces, photos et stockage des images
-- À exécuter une fois dans Supabase > SQL Editor, après 20261010000000_profils_roles.sql.

-- Les politiques ci-dessous appellent a_le_role aussi pour les visiteurs ;
-- la fonction renvoie toujours faux pour eux.
grant execute on function public.a_le_role(public.role_utilisateur[]) to anon;

-- Catégories -----------------------------------------------------------------

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  libelle text not null check (char_length(libelle) between 2 and 40),
  ordre smallint not null default 0
);

alter table public.categories enable row level security;
revoke insert, update, delete on public.categories from anon, authenticated;

create policy "catégories visibles par tous"
  on public.categories for select
  to anon, authenticated
  using (true);

insert into public.categories (slug, libelle, ordre) values
  ('mode', 'Mode', 1),
  ('maison', 'Maison', 2),
  ('multimedia', 'Multimédia', 3),
  ('electromenager', 'Électroménager', 4),
  ('velos', 'Vélos', 5),
  ('enfants', 'Enfants', 6),
  ('loisirs', 'Loisirs', 7),
  ('sport', 'Sport', 8),
  ('bricolage', 'Bricolage', 9),
  ('autres', 'Autres', 99);

-- Annonces -------------------------------------------------------------------

create type public.statut_annonce as enum ('publiee', 'reservee', 'vendue');
create type public.moderation_annonce as enum ('visible', 'masquee');

create table public.annonces (
  id uuid primary key default gen_random_uuid(),
  vendeur uuid not null references public.profils (id) on delete cascade,
  titre text not null check (char_length(titre) between 5 and 80),
  description text not null check (char_length(description) between 20 and 4000),
  -- De 1 € à 1 000 000 €, en centimes
  prix_centimes integer not null check (prix_centimes between 100 and 100000000),
  categorie text not null references public.categories (slug),
  ville text not null check (char_length(ville) between 2 and 80),
  code_postal text not null check (code_postal ~ '^[0-9]{5}$'),
  main_propre boolean not null default true,
  livraison boolean not null default false,
  statut public.statut_annonce not null default 'publiee',
  moderation public.moderation_annonce not null default 'visible',
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  recherche tsvector generated always as (
    setweight(to_tsvector('french', titre), 'A') ||
    setweight(to_tsvector('french', description), 'B')
  ) stored,
  constraint au_moins_un_mode_de_remise check (main_propre or livraison)
);

create index annonces_recherche on public.annonces using gin (recherche);
create index annonces_recentes on public.annonces (moderation, cree_le desc);
create index annonces_categorie on public.annonces (categorie, cree_le desc);
create index annonces_vendeur on public.annonces (vendeur, cree_le desc);

create trigger annonces_modifie_le
  before update on public.annonces
  for each row execute function public.horodater_modification();

alter table public.annonces enable row level security;

revoke select, insert, update, delete on public.annonces from anon, authenticated;
grant select (id, vendeur, titre, description, prix_centimes, categorie, ville, code_postal,
              main_propre, livraison, statut, moderation, cree_le, modifie_le, recherche)
  on public.annonces to anon, authenticated;
grant insert (vendeur, titre, description, prix_centimes, categorie, ville, code_postal,
              main_propre, livraison)
  on public.annonces to authenticated;
-- La modération (masquer / réafficher) passe par des fonctions réservées aux modérateurs
grant update (titre, description, prix_centimes, categorie, ville, code_postal,
              main_propre, livraison, statut)
  on public.annonces to authenticated;
grant delete on public.annonces to authenticated;

-- Peut déposer : informations personnelles complétées et compte non bloqué
create function public.peut_publier()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.informations_privees i where i.id = auth.uid())
     and not exists (select 1 from public.profils p where p.id = auth.uid() and p.bloque);
$$;

revoke execute on function public.peut_publier() from public, anon;
grant execute on function public.peut_publier() to authenticated;

create policy "annonces visibles"
  on public.annonces for select
  to anon, authenticated
  using (
    moderation = 'visible'
    or vendeur = (select auth.uid())
    or public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[])
  );

create policy "déposer une annonce"
  on public.annonces for insert
  to authenticated
  with check (vendeur = (select auth.uid()) and public.peut_publier());

create policy "modifier ses annonces"
  on public.annonces for update
  to authenticated
  using (vendeur = (select auth.uid()))
  with check (vendeur = (select auth.uid()));

create policy "supprimer ses annonces"
  on public.annonces for delete
  to authenticated
  using (vendeur = (select auth.uid()));

-- Photos ---------------------------------------------------------------------

create table public.photos_annonces (
  id uuid primary key default gen_random_uuid(),
  annonce uuid not null references public.annonces (id) on delete cascade,
  chemin text not null unique,
  position smallint not null default 0 check (position between 0 and 7),
  cree_le timestamptz not null default now()
);

create index photos_annonces_annonce on public.photos_annonces (annonce, position);

alter table public.photos_annonces enable row level security;

revoke select, insert, update, delete on public.photos_annonces from anon, authenticated;
grant select (id, annonce, chemin, position, cree_le) on public.photos_annonces to anon, authenticated;
grant insert (annonce, chemin, position) on public.photos_annonces to authenticated;
grant update (position) on public.photos_annonces to authenticated;
grant delete on public.photos_annonces to authenticated;

-- Visible si l'annonce l'est (la règle des annonces s'applique dans la sous-requête)
create policy "photos visibles avec l'annonce"
  on public.photos_annonces for select
  to anon, authenticated
  using (exists (select 1 from public.annonces a where a.id = annonce));

create policy "ajouter des photos à ses annonces"
  on public.photos_annonces for insert
  to authenticated
  with check (
    exists (select 1 from public.annonces a where a.id = annonce and a.vendeur = (select auth.uid()))
    and chemin like (select auth.uid())::text || '/%'
  );

create policy "réordonner ses photos"
  on public.photos_annonces for update
  to authenticated
  using (exists (select 1 from public.annonces a where a.id = annonce and a.vendeur = (select auth.uid())));

create policy "retirer ses photos"
  on public.photos_annonces for delete
  to authenticated
  using (exists (select 1 from public.annonces a where a.id = annonce and a.vendeur = (select auth.uid())));

-- 8 photos au maximum par annonce
create function public.limiter_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.photos_annonces where annonce = new.annonce) >= 8 then
    raise exception 'Une annonce compte 8 photos au maximum' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger photos_annonces_limite
  before insert on public.photos_annonces
  for each row execute function public.limiter_photos();

-- Stockage des images ----------------------------------------------------------
-- Lecture publique par URL ; chaque membre n'écrit que dans son propre dossier.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-annonces', 'photos-annonces', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos : lire son dossier"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos : déposer dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos : supprimer dans son dossier"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos-annonces' and (storage.foldername(name))[1] = (select auth.uid())::text);
