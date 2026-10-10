-- Troqly : profils, rôles et journal d'audit
-- À exécuter une fois dans Supabase > SQL Editor (ou avec la CLI Supabase).

-- Rôles ---------------------------------------------------------------------

create type public.role_utilisateur as enum ('utilisateur', 'moderateur', 'administrateur');

-- Profils -------------------------------------------------------------------

create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 3 and 30),
  ville text check (ville is null or char_length(ville) <= 80),
  role public.role_utilisateur not null default 'utilisateur',
  bloque boolean not null default false,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

alter table public.profils enable row level security;

-- Seules les colonnes publiques sont lisibles par l'API ; le rôle et le blocage
-- passent par des fonctions contrôlées.
revoke select, insert, update, delete on public.profils from anon, authenticated;
grant select (id, pseudo, ville, cree_le) on public.profils to anon, authenticated;
grant update (pseudo, ville) on public.profils to authenticated;

create policy "profils visibles par tous"
  on public.profils for select
  to anon, authenticated
  using (true);

create policy "chacun modifie son profil"
  on public.profils for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.horodater_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.modifie_le := now();
  return new;
end;
$$;

create trigger profils_modifie_le
  before update on public.profils
  for each row execute function public.horodater_modification();

-- Informations privées ---------------------------------------------------------
-- Visibles uniquement par la personne concernée. Elles ne sont jamais publiées
-- sur les annonces. La clé étrangère est différée pour permettre l'insertion
-- avant celle du compte, dans la même transaction (voir preparer_utilisateur).

create table public.informations_privees (
  id uuid primary key references auth.users (id) on delete cascade deferrable initially deferred,
  prenom text not null check (char_length(prenom) between 1 and 50),
  nom text not null check (char_length(nom) between 1 and 50),
  date_naissance date not null,
  telephone text check (telephone is null or telephone ~ '^\+33[1-9][0-9]{8}$'),
  modifie_le timestamptz not null default now()
);

alter table public.informations_privees enable row level security;

revoke select, insert, update, delete on public.informations_privees from anon, authenticated;
grant select (id, prenom, nom, date_naissance, telephone) on public.informations_privees to authenticated;
grant update (prenom, nom, telephone) on public.informations_privees to authenticated;

create policy "chacun lit ses informations privées"
  on public.informations_privees for select
  to authenticated
  using (id = (select auth.uid()));

create policy "chacun modifie ses informations privées"
  on public.informations_privees for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create trigger informations_privees_modifie_le
  before update on public.informations_privees
  for each row execute function public.horodater_modification();

-- Avant la création du compte : vérifie l'âge, range les informations privées
-- dans leur table et les retire des métadonnées du compte, pour qu'elles ne
-- circulent pas dans les jetons de session.
create function public.preparer_utilisateur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_prenom text := trim(coalesce(m ->> 'prenom', ''));
  v_nom text := trim(coalesce(m ->> 'nom', ''));
  v_telephone text := nullif(trim(coalesce(m ->> 'telephone', '')), '');
  v_naissance date;
begin
  -- Compte créé depuis le tableau de bord Supabase, sans formulaire d'inscription
  if not (m ? 'prenom' or m ? 'nom' or m ? 'date_naissance') then
    return new;
  end if;

  begin
    v_naissance := (m ->> 'date_naissance')::date;
  exception when others then
    v_naissance := null;
  end;

  if v_naissance is null or v_naissance > (current_date - interval '18 years')::date then
    raise exception 'Troqly est réservé aux personnes majeures' using errcode = '22023';
  end if;

  insert into public.informations_privees (id, prenom, nom, date_naissance, telephone)
  values (new.id, v_prenom, v_nom, v_naissance, v_telephone);

  new.raw_user_meta_data := m - 'prenom' - 'nom' - 'date_naissance' - 'telephone';
  return new;
end;
$$;

create trigger avant_creation_utilisateur
  before insert on auth.users
  for each row execute function public.preparer_utilisateur();

-- Création automatique du profil à l'inscription. Le rôle n'est jamais lu
-- depuis les données envoyées par le navigateur : il vaut toujours « utilisateur ».
create function public.creer_profil()
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
  insert into public.profils (id, pseudo) values (new.id, v_pseudo);
  return new;
end;
$$;

create trigger apres_creation_utilisateur
  after insert on auth.users
  for each row execute function public.creer_profil();

-- Contrôle des rôles ---------------------------------------------------------

create function public.a_le_role(roles public.role_utilisateur[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profils p
    where p.id = auth.uid() and p.role = any (roles) and not p.bloque
  );
$$;

create function public.mon_role()
returns public.role_utilisateur
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profils where id = auth.uid();
$$;

revoke execute on function public.a_le_role(public.role_utilisateur[]) from public, anon;
revoke execute on function public.mon_role() from public, anon;
grant execute on function public.a_le_role(public.role_utilisateur[]) to authenticated;
grant execute on function public.mon_role() to authenticated;

-- Journal d'audit ------------------------------------------------------------

create table public.journal_audit (
  id bigint generated always as identity primary key,
  acteur uuid references auth.users (id) on delete set null,
  action text not null,
  cible_type text not null,
  cible_id text not null,
  details jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);

alter table public.journal_audit enable row level security;

-- Aucune écriture directe : uniquement via les fonctions ci-dessous.
revoke insert, update, delete on public.journal_audit from anon, authenticated;
revoke select on public.journal_audit from anon;

create policy "journal lisible par les administrateurs"
  on public.journal_audit for select
  to authenticated
  using (public.a_le_role(array['administrateur']::public.role_utilisateur[]));

-- Changement de rôle, réservé aux administrateurs et journalisé
create function public.definir_role(cible uuid, nouveau public.role_utilisateur)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ancien public.role_utilisateur;
begin
  if not public.a_le_role(array['administrateur']::public.role_utilisateur[]) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  if cible = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier votre propre rôle' using errcode = '42501';
  end if;

  select role into ancien from public.profils where id = cible for update;
  if not found then
    raise exception 'Profil introuvable' using errcode = 'P0002';
  end if;

  update public.profils set role = nouveau where id = cible;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), 'changement_role', 'profil', cible::text,
          jsonb_build_object('ancien', ancien, 'nouveau', nouveau));
end;
$$;

revoke execute on function public.definir_role(uuid, public.role_utilisateur) from public, anon;
grant execute on function public.definir_role(uuid, public.role_utilisateur) to authenticated;

-- Premier administrateur -----------------------------------------------------
-- Appelable uniquement depuis le SQL Editor de Supabase (rôle postgres),
-- jamais depuis le site. Refuse s'il existe déjà un administrateur.
create function public.promouvoir_premier_administrateur(adresse text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if exists (select 1 from public.profils where role = 'administrateur') then
    raise exception 'Un administrateur existe déjà. Utilisez le tableau de bord pour changer les rôles.';
  end if;

  select id into v_id from auth.users
  where lower(email) = lower(trim(adresse)) and email_confirmed_at is not null;
  if v_id is null then
    raise exception 'Aucun compte confirmé avec cette adresse. Inscrivez-vous et confirmez votre e-mail d''abord.';
  end if;

  update public.profils set role = 'administrateur' where id = v_id;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (null, 'premier_administrateur', 'profil', v_id::text, '{}'::jsonb);
end;
$$;

revoke execute on function public.promouvoir_premier_administrateur(text) from public, anon, authenticated;
