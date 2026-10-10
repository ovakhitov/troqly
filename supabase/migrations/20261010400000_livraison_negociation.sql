-- Troqly : livraison payée par l'acheteur, suivi d'envoi, négociation (offres)
-- À exécuter une fois dans Supabase > SQL Editor, après 20261010300000_paiements.sql.

-- Formats de colis ------------------------------------------------------------

create type public.format_colis as enum ('petit', 'moyen', 'grand');

alter table public.annonces add column format_colis public.format_colis;
grant select (format_colis) on public.annonces to anon, authenticated;
grant insert (format_colis) on public.annonces to authenticated;
grant update (format_colis) on public.annonces to authenticated;

-- Tarifs de livraison (indicatifs, modifiables par l'administrateur) ------------

create type public.mode_livraison as enum ('domicile', 'point_relais');

create table public.tarifs_livraison (
  id smallint generated always as identity primary key,
  transporteur text not null,
  libelle text not null,
  mode public.mode_livraison not null,
  format public.format_colis not null,
  prix_centimes integer not null check (prix_centimes between 0 and 20000),
  delai text not null,
  actif boolean not null default true,
  ordre smallint not null default 0,
  unique (transporteur, mode, format)
);

alter table public.tarifs_livraison enable row level security;
revoke insert, update, delete on public.tarifs_livraison from anon, authenticated;

create policy "tarifs visibles par tous"
  on public.tarifs_livraison for select to anon, authenticated
  using (actif or public.a_le_role(array['administrateur']::public.role_utilisateur[]));

-- Tarifs de départ à vérifier sur les grilles des transporteurs avant la mise en ligne
insert into public.tarifs_livraison (transporteur, libelle, mode, format, prix_centimes, delai, ordre) values
  ('mondial_relay', 'Mondial Relay', 'point_relais', 'petit', 449, '3 à 5 jours', 1),
  ('mondial_relay', 'Mondial Relay', 'point_relais', 'moyen', 699, '3 à 5 jours', 1),
  ('mondial_relay', 'Mondial Relay', 'point_relais', 'grand', 1199, '3 à 5 jours', 1),
  ('relais_colis', 'Relais Colis', 'point_relais', 'petit', 459, '3 à 6 jours', 2),
  ('relais_colis', 'Relais Colis', 'point_relais', 'moyen', 719, '3 à 6 jours', 2),
  ('relais_colis', 'Relais Colis', 'point_relais', 'grand', 1249, '3 à 6 jours', 2),
  ('colissimo', 'Colissimo', 'domicile', 'petit', 749, '2 à 3 jours', 3),
  ('colissimo', 'Colissimo', 'domicile', 'moyen', 1049, '2 à 3 jours', 3),
  ('colissimo', 'Colissimo', 'domicile', 'grand', 1699, '2 à 3 jours', 3),
  ('chronopost', 'Chronopost', 'domicile', 'petit', 1290, '24 h', 4),
  ('chronopost', 'Chronopost', 'domicile', 'moyen', 1690, '24 h', 4),
  ('chronopost', 'Chronopost', 'domicile', 'grand', 2490, '24 h', 4);

create function public.modifier_tarif(id_tarif smallint, prix integer, actif boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.a_le_role(array['administrateur']::public.role_utilisateur[]) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  update public.tarifs_livraison set prix_centimes = prix, actif = modifier_tarif.actif where id = id_tarif;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), 'tarif_modifie', 'tarif_livraison', id_tarif::text,
          jsonb_build_object('prix', prix, 'actif', modifier_tarif.actif));
end;
$$;

revoke execute on function public.modifier_tarif(smallint, integer, boolean) from public, anon;
grant execute on function public.modifier_tarif(smallint, integer, boolean) to authenticated;

-- Livraison dans les commandes ---------------------------------------------------

alter table public.commandes
  add column livraison_centimes integer not null default 0 check (livraison_centimes >= 0),
  add column transporteur text,
  add column mode_livraison public.mode_livraison,
  add column point_relais text check (point_relais is null or char_length(point_relais) <= 300),
  add column adresse_livraison jsonb,
  add column numero_suivi text check (numero_suivi is null or char_length(numero_suivi) <= 60),
  add column expediee_le timestamptz,
  add column offre bigint;

-- Retire l'ancienne règle « total = prix + frais », quel que soit le nom donné par Postgres
do $$
declare
  nom text;
begin
  for nom in
    select conname from pg_constraint
    where conrelid = 'public.commandes'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%total_centimes = (prix_centimes + frais_service_centimes)%'
  loop
    execute format('alter table public.commandes drop constraint %I', nom);
  end loop;
end;
$$;
alter table public.commandes
  add constraint commandes_total check (total_centimes = prix_centimes + frais_service_centimes + livraison_centimes);

-- L'adresse et le point relais ne sont visibles que de l'acheteur et du vendeur (règle déjà en place)
grant select (livraison_centimes, transporteur, mode_livraison, point_relais, adresse_livraison,
              numero_suivi, expediee_le, offre)
  on public.commandes to authenticated;

-- Négociation ---------------------------------------------------------------------

create type public.statut_offre as enum ('en_attente', 'contre_proposee', 'acceptee', 'refusee', 'retiree', 'utilisee');

create table public.offres (
  id bigint generated always as identity primary key,
  annonce uuid not null references public.annonces (id) on delete cascade,
  acheteur uuid not null references public.profils (id) on delete cascade,
  vendeur uuid not null references public.profils (id) on delete cascade,
  montant_centimes integer not null check (montant_centimes >= 100),
  contre_centimes integer check (contre_centimes is null or contre_centimes >= 100),
  statut public.statut_offre not null default 'en_attente',
  cree_le timestamptz not null default now(),
  repondu_le timestamptz,
  -- Une offre acceptée permet d'acheter à ce prix pendant 48 heures
  valable_jusqu_au timestamptz,
  check (acheteur <> vendeur)
);

create index offres_annonce on public.offres (annonce, cree_le desc);
create index offres_acheteur on public.offres (acheteur, cree_le desc);
create index offres_vendeur on public.offres (vendeur, cree_le desc);
-- Une seule négociation ouverte par acheteur et par annonce
create unique index offres_une_ouverte on public.offres (annonce, acheteur)
  where statut in ('en_attente', 'contre_proposee', 'acceptee');

alter table public.offres enable row level security;
revoke select, insert, update, delete on public.offres from anon, authenticated;
grant select on public.offres to authenticated;

create policy "acheteur et vendeur voient l'offre"
  on public.offres for select to authenticated
  using ((select auth.uid()) in (acheteur, vendeur));

create function public.faire_offre(id_annonce uuid, montant integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  v_id bigint;
begin
  if auth.uid() is null or public.est_bloque(auth.uid()) then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  select id, vendeur, prix_centimes into a from public.annonces
  where id = id_annonce and moderation = 'visible' and statut = 'publiee';
  if not found then
    raise exception 'Annonce indisponible' using errcode = 'P0002';
  end if;

  -- Une offre acceptée mais non utilisée dans les 48 heures ne bloque plus une nouvelle offre
  update public.offres set statut = 'retiree'
  where annonce = id_annonce and acheteur = auth.uid() and statut = 'acceptee' and valable_jusqu_au < now();
  if a.vendeur = auth.uid() then
    raise exception 'Vous ne pouvez pas faire d''offre sur votre annonce' using errcode = '22023';
  end if;
  if public.blocage_entre(auth.uid(), a.vendeur) then
    raise exception 'Offre impossible' using errcode = '42501';
  end if;
  if montant >= a.prix_centimes or montant < greatest(100, a.prix_centimes / 2) then
    raise exception 'L''offre doit être inférieure au prix et d''au moins la moitié du prix' using errcode = '22023';
  end if;

  insert into public.offres (annonce, acheteur, vendeur, montant_centimes)
  values (id_annonce, auth.uid(), a.vendeur, montant)
  returning id into v_id;
  return v_id;
end;
$$;

-- Réponse du vendeur : accepter, refuser ou contre-proposer
create function public.repondre_offre(id_offre bigint, decision text, contre integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offres;
  v_prix integer;
begin
  select * into o from public.offres where id = id_offre for update;
  if o.id is null or o.vendeur <> auth.uid() or o.statut <> 'en_attente' then
    raise exception 'Offre introuvable ou déjà traitée' using errcode = 'P0002';
  end if;

  if decision = 'accepter' then
    update public.offres set statut = 'acceptee', repondu_le = now(), valable_jusqu_au = now() + interval '48 hours'
    where id = id_offre;
  elsif decision = 'refuser' then
    update public.offres set statut = 'refusee', repondu_le = now() where id = id_offre;
  elsif decision = 'contre' then
    select prix_centimes into v_prix from public.annonces where id = o.annonce;
    if contre is null or contre <= o.montant_centimes or contre >= v_prix then
      raise exception 'La contre-proposition doit être entre l''offre et le prix affiché' using errcode = '22023';
    end if;
    update public.offres set statut = 'contre_proposee', contre_centimes = contre, repondu_le = now() where id = id_offre;
  else
    raise exception 'Décision invalide' using errcode = '22023';
  end if;
end;
$$;

-- Réponse de l'acheteur à une contre-proposition, ou retrait de son offre
create function public.reponse_acheteur(id_offre bigint, accepter boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offres;
begin
  select * into o from public.offres where id = id_offre for update;
  if o.id is null or o.acheteur <> auth.uid() then
    raise exception 'Offre introuvable' using errcode = 'P0002';
  end if;
  if accepter and o.statut = 'contre_proposee' then
    update public.offres set statut = 'acceptee', repondu_le = now(), valable_jusqu_au = now() + interval '48 hours'
    where id = id_offre;
  elsif not accepter and o.statut in ('en_attente', 'contre_proposee', 'acceptee') then
    update public.offres set statut = 'retiree', repondu_le = now() where id = id_offre;
  else
    raise exception 'Cette offre ne peut plus être modifiée' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.faire_offre(uuid, integer) from public, anon;
revoke execute on function public.repondre_offre(bigint, text, integer) from public, anon;
revoke execute on function public.reponse_acheteur(bigint, boolean) from public, anon;
grant execute on function public.faire_offre(uuid, integer) to authenticated;
grant execute on function public.repondre_offre(bigint, text, integer) to authenticated;
grant execute on function public.reponse_acheteur(bigint, boolean) to authenticated;
