-- Troqly : comptes de paiement des vendeurs (Stripe Connect) et commandes
-- À exécuter une fois dans Supabase > SQL Editor, après 20261010200000_messagerie_moderation.sql.
-- Toutes les écritures passent par le serveur (clé secrète), jamais par le navigateur.

-- Comptes de paiement --------------------------------------------------------

create table public.comptes_paiement (
  membre uuid primary key references public.profils (id) on delete cascade,
  stripe_compte text not null unique,
  versements_actifs boolean not null default false,
  infos_completes boolean not null default false,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

alter table public.comptes_paiement enable row level security;
revoke select, insert, update, delete on public.comptes_paiement from anon, authenticated;
grant select (membre, versements_actifs, infos_completes) on public.comptes_paiement to authenticated;

create policy "chacun voit son compte de paiement"
  on public.comptes_paiement for select to authenticated
  using (membre = (select auth.uid()));

create trigger comptes_paiement_modifie_le
  before update on public.comptes_paiement
  for each row execute function public.horodater_modification();

-- Vrai si le vendeur peut recevoir des paiements (lisible par tous pour afficher « Acheter »)
create function public.vendeur_paiement_actif(id_vendeur uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select versements_actifs from public.comptes_paiement where membre = id_vendeur), false);
$$;

revoke execute on function public.vendeur_paiement_actif(uuid) from public;
grant execute on function public.vendeur_paiement_actif(uuid) to anon, authenticated;

-- Commandes ------------------------------------------------------------------

create type public.statut_commande as enum ('en_attente', 'payee', 'terminee', 'annulee', 'remboursee', 'litige');
create type public.mode_remise as enum ('main_propre', 'livraison');

create table public.commandes (
  id uuid primary key default gen_random_uuid(),
  annonce uuid references public.annonces (id) on delete set null,
  -- Copies conservées même si l'annonce ou un compte disparaît (obligations comptables)
  titre text not null,
  acheteur uuid references public.profils (id) on delete set null,
  vendeur uuid references public.profils (id) on delete set null,
  prix_centimes integer not null check (prix_centimes > 0),
  frais_service_centimes integer not null check (frais_service_centimes >= 0),
  total_centimes integer not null check (total_centimes = prix_centimes + frais_service_centimes),
  mode_remise public.mode_remise not null,
  statut public.statut_commande not null default 'en_attente',
  -- Code à 6 chiffres que l'acheteur donne au vendeur lors d'une remise en main propre
  code_remise text not null check (code_remise ~ '^[0-9]{6}$'),
  -- Essais de code par le vendeur, bloqués au-delà de 5
  essais_code smallint not null default 0,
  stripe_session text unique,
  stripe_paiement text,
  stripe_charge text,
  stripe_virement text,
  cree_le timestamptz not null default now(),
  payee_le timestamptz,
  terminee_le timestamptz
);

create index commandes_acheteur on public.commandes (acheteur, cree_le desc);
create index commandes_vendeur on public.commandes (vendeur, cree_le desc);
-- Une seule commande payée à la fois par annonce
create unique index commandes_une_payee on public.commandes (annonce) where statut in ('payee', 'litige');

alter table public.commandes enable row level security;
revoke select, insert, update, delete on public.commandes from anon, authenticated;
-- Le code de remise n'est pas lisible directement : voir code_remise_acheteur()
grant select (id, annonce, titre, acheteur, vendeur, prix_centimes, frais_service_centimes, total_centimes,
              mode_remise, statut, cree_le, payee_le, terminee_le)
  on public.commandes to authenticated;

create policy "acheteur, vendeur et modération voient la commande"
  on public.commandes for select to authenticated
  using (
    (select auth.uid()) in (acheteur, vendeur)
    or public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[])
  );

-- Le code n'est montré qu'à l'acheteur, une fois la commande payée
create function public.code_remise_acheteur(id_commande uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select code_remise from public.commandes
  where id = id_commande and acheteur = auth.uid() and statut = 'payee' and mode_remise = 'main_propre';
$$;

revoke execute on function public.code_remise_acheteur(uuid) from public, anon;
grant execute on function public.code_remise_acheteur(uuid) to authenticated;
