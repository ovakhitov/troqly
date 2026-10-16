-- Troqly : boosts payants des annonces (remontée immédiate, visibilité 7 jours, à la une 7 jours)
-- À exécuter une fois dans Supabase > SQL Editor, après 20261013150000_annonces_boostees.sql
-- et AVANT de fusionner le code qui lit ces colonnes. Rien n'est supprimé ni écrasé :
-- la seule donnée recopiée est la date de publication, dans la nouvelle colonne remontee_le.

-- Classement des annonces --------------------------------------------------------

-- Date qui sert au classement « plus récentes d'abord » : la publication, ou la dernière remontée payée.
-- La date de publication affichée (cree_le) ne change jamais.
alter table public.annonces add column if not exists remontee_le timestamptz;
update public.annonces set remontee_le = cree_le where remontee_le is null;
alter table public.annonces alter column remontee_le set default now();
alter table public.annonces alter column remontee_le set not null;

-- Lisible par tous, modifiable seulement par le serveur (aucun droit d'écriture donné aux membres)
grant select (remontee_le) on public.annonces to anon, authenticated;

create index if not exists annonces_classement on public.annonces (moderation, remontee_le desc);

-- Achats de boost -------------------------------------------------------------

do $$ begin
  create type public.formule_boost as enum ('remontee', 'visibilite_7j', 'une_7j');
exception when duplicate_object then null; end $$;

-- en_attente : paiement Stripe ouvert · actif : payé et en cours · termine : arrivé à son terme
-- interrompu : arrêté avant la fin (annonce vendue, supprimée, arrêt par l'équipe) · rembourse · annule : paiement abandonné
do $$ begin
  create type public.statut_boost as enum ('en_attente', 'actif', 'termine', 'interrompu', 'rembourse', 'annule');
exception when duplicate_object then null; end $$;

create table if not exists public.achats_boost (
  id uuid primary key default gen_random_uuid(),
  annonce uuid references public.annonces (id) on delete set null,
  vendeur uuid references public.profils (id) on delete set null,
  -- Copie gardée même si l'annonce disparaît (obligations comptables)
  titre text not null,
  formule public.formule_boost not null,
  prix_centimes integer not null check (prix_centimes > 0),
  statut public.statut_boost not null default 'en_attente',
  debut timestamptz,
  fin timestamptz,
  remontees_faites smallint not null default 0,
  derniere_remontee timestamptz,
  motif_fin text check (motif_fin is null or char_length(motif_fin) <= 300),
  stripe_session text unique,
  stripe_paiement text,
  stripe_charge text,
  cree_le timestamptz not null default now(),
  payee_le timestamptz,
  termine_le timestamptz
);

create index if not exists achats_boost_vendeur on public.achats_boost (vendeur, cree_le desc);
create index if not exists achats_boost_annonce on public.achats_boost (annonce, statut);
create index if not exists achats_boost_charge on public.achats_boost (stripe_charge);
-- Contre le double paiement : un seul paiement ouvert par annonce et par formule,
-- et une seule formule de durée en cours à la fois
create unique index if not exists achats_boost_un_en_attente on public.achats_boost (annonce, formule) where statut = 'en_attente';
create unique index if not exists achats_boost_un_actif on public.achats_boost (annonce, formule) where statut = 'actif';

alter table public.achats_boost enable row level security;
revoke select, insert, update, delete on public.achats_boost from anon, authenticated;
-- Toutes les écritures passent par le serveur (clé secrète) ; le vendeur lit ses propres achats
grant select (id, annonce, vendeur, titre, formule, prix_centimes, statut, debut, fin, remontees_faites,
              derniere_remontee, motif_fin, cree_le, payee_le, termine_le)
  on public.achats_boost to authenticated;

drop policy if exists "le vendeur voit ses boosts" on public.achats_boost;
create policy "le vendeur voit ses boosts"
  on public.achats_boost for select to authenticated
  using (
    vendeur = (select auth.uid())
    or public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[])
  );

-- Annonce vendue ou supprimée : ses boosts s'arrêtent pour de bon --------------

create or replace function public.arreter_boosts_annonce()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.achats_boost
      set statut = 'interrompu', motif_fin = 'Annonce supprimée', termine_le = now()
      where annonce = old.id and statut = 'actif';
    return old;
  end if;

  if new.statut = 'vendue' and old.statut is distinct from 'vendue' then
    update public.achats_boost
      set statut = 'interrompu', motif_fin = 'Annonce vendue', termine_le = now()
      where annonce = new.id and statut = 'actif';
    new.boost_jusqua := null;
  end if;
  return new;
end;
$$;

drop trigger if exists annonces_arreter_boosts on public.annonces;
create trigger annonces_arreter_boosts
  before update of statut or delete on public.annonces
  for each row execute function public.arreter_boosts_annonce();

-- Tâche horaire : remontées quotidiennes et fin des boosts --------------------

-- « Visibilité 7 jours » : une remontée par jour, au même moment que l'achat, 7 fois.
-- Une annonce réservée ou masquée par la modération n'est pas remontée (le jour est perdu,
-- la fin reste la même) ; elle reprend si elle redevient disponible avant la fin.
create or replace function public.appliquer_boosts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with dus as (
    select b.id, b.annonce
    from public.achats_boost b
    join public.annonces a on a.id = b.annonce
    where b.statut = 'actif'
      and b.formule = 'visibilite_7j'
      and now() < b.fin
      and b.remontees_faites < 7
      and now() >= b.debut + b.remontees_faites * interval '1 day'
      and a.statut = 'publiee'
      and a.moderation = 'visible'
    for update of b skip locked
  ), remontees as (
    update public.annonces a set remontee_le = now() from dus where a.id = dus.annonce returning a.id
  )
  update public.achats_boost b
    set remontees_faites = least(7, floor(extract(epoch from now() - b.debut) / 86400)::int + 1),
        derniere_remontee = now()
    from dus
    where b.id = dus.id;

  update public.achats_boost
    set statut = 'termine', termine_le = now()
    where statut = 'actif' and fin <= now();
end;
$$;

revoke execute on function public.appliquer_boosts() from public, anon, authenticated;

-- Planification toutes les heures (extension pg_cron, incluse dans Supabase)
create extension if not exists pg_cron;
select cron.schedule('troqly-boosts', '7 * * * *', 'select public.appliquer_boosts()');
