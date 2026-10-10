-- Troqly : favoris, messagerie, blocages entre membres, signalements, modération
-- À exécuter une fois dans Supabase > SQL Editor, après 20261010100000_annonces.sql.

-- La colonne « bloque » n'est pas lisible par l'API : les règles passent par cette fonction
create function public.est_bloque(membre uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select bloque from public.profils where id = membre), false);
$$;

revoke execute on function public.est_bloque(uuid) from public;
grant execute on function public.est_bloque(uuid) to anon, authenticated;

-- Favoris --------------------------------------------------------------------

create table public.favoris (
  membre uuid not null references public.profils (id) on delete cascade,
  annonce uuid not null references public.annonces (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (membre, annonce)
);

alter table public.favoris enable row level security;
revoke select, insert, update, delete on public.favoris from anon, authenticated;
grant select, delete on public.favoris to authenticated;
grant insert (membre, annonce) on public.favoris to authenticated;

create policy "chacun voit ses favoris"
  on public.favoris for select to authenticated
  using (membre = (select auth.uid()));

create policy "chacun ajoute ses favoris"
  on public.favoris for insert to authenticated
  with check (membre = (select auth.uid()) and exists (select 1 from public.annonces a where a.id = annonce));

create policy "chacun retire ses favoris"
  on public.favoris for delete to authenticated
  using (membre = (select auth.uid()));

-- Blocages entre membres -----------------------------------------------------

create table public.blocages (
  bloqueur uuid not null references public.profils (id) on delete cascade,
  bloque uuid not null references public.profils (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (bloqueur, bloque),
  check (bloqueur <> bloque)
);

alter table public.blocages enable row level security;
revoke select, insert, update, delete on public.blocages from anon, authenticated;
grant select, delete on public.blocages to authenticated;
grant insert (bloqueur, bloque) on public.blocages to authenticated;

create policy "chacun voit ses blocages"
  on public.blocages for select to authenticated
  using (bloqueur = (select auth.uid()));

create policy "chacun bloque"
  on public.blocages for insert to authenticated
  with check (bloqueur = (select auth.uid()));

create policy "chacun débloque"
  on public.blocages for delete to authenticated
  using (bloqueur = (select auth.uid()));

-- Vrai si l'un des deux membres a bloqué l'autre
create function public.blocage_entre(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocages
    where (bloqueur = a and bloque = b) or (bloqueur = b and bloque = a)
  );
$$;

revoke execute on function public.blocage_entre(uuid, uuid) from public, anon;
grant execute on function public.blocage_entre(uuid, uuid) to authenticated;

-- Conversations et messages --------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  annonce uuid not null references public.annonces (id) on delete cascade,
  acheteur uuid not null references public.profils (id) on delete cascade,
  vendeur uuid not null references public.profils (id) on delete cascade,
  cree_le timestamptz not null default now(),
  dernier_message_le timestamptz not null default now(),
  unique (annonce, acheteur),
  check (acheteur <> vendeur)
);

create index conversations_acheteur on public.conversations (acheteur, dernier_message_le desc);
create index conversations_vendeur on public.conversations (vendeur, dernier_message_le desc);

alter table public.conversations enable row level security;
revoke select, insert, update, delete on public.conversations from anon, authenticated;
grant select on public.conversations to authenticated;

create policy "participants voient la conversation"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (acheteur, vendeur));

create table public.messages (
  id bigint generated always as identity primary key,
  conversation uuid not null references public.conversations (id) on delete cascade,
  auteur uuid not null references public.profils (id) on delete cascade,
  contenu text not null check (char_length(trim(contenu)) between 1 and 2000),
  cree_le timestamptz not null default now(),
  lu_le timestamptz
);

create index messages_conversation on public.messages (conversation, cree_le);

alter table public.messages enable row level security;
revoke select, insert, update, delete on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (conversation, auteur, contenu) on public.messages to authenticated;

create policy "participants lisent les messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation and (select auth.uid()) in (c.acheteur, c.vendeur)
  ));

-- Écrire : participant, compte non bloqué par la modération, pas de blocage entre les deux
create policy "participants écrivent"
  on public.messages for insert to authenticated
  with check (
    auteur = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation
        and (select auth.uid()) in (c.acheteur, c.vendeur)
        and not public.blocage_entre(c.acheteur, c.vendeur)
    )
    and not public.est_bloque((select auth.uid()))
  );

create function public.horodater_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set dernier_message_le = new.cree_le where id = new.conversation;
  return new;
end;
$$;

create trigger messages_dernier
  after insert on public.messages
  for each row execute function public.horodater_conversation();

-- Ouvre (ou retrouve) la conversation de l'acheteur sur une annonce
create function public.ouvrir_conversation(id_annonce uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendeur uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (select 1 from public.profils where id = auth.uid() and bloque) then
    raise exception 'Compte suspendu' using errcode = '42501';
  end if;

  select vendeur into v_vendeur from public.annonces
  where id = id_annonce and moderation = 'visible' and statut <> 'vendue';
  if v_vendeur is null then
    raise exception 'Annonce indisponible' using errcode = 'P0002';
  end if;
  if v_vendeur = auth.uid() then
    raise exception 'Vous ne pouvez pas vous écrire à vous-même' using errcode = '22023';
  end if;
  if public.blocage_entre(auth.uid(), v_vendeur) then
    raise exception 'Conversation impossible' using errcode = '42501';
  end if;

  insert into public.conversations (annonce, acheteur, vendeur)
  values (id_annonce, auth.uid(), v_vendeur)
  on conflict (annonce, acheteur) do update set annonce = excluded.annonce
  returning id into v_id;
  return v_id;
end;
$$;

-- Marque comme lus les messages reçus dans une conversation
create function public.marquer_lu(id_conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages m set lu_le = now()
  from public.conversations c
  where m.conversation = id_conversation
    and c.id = m.conversation
    and auth.uid() in (c.acheteur, c.vendeur)
    and m.auteur <> auth.uid()
    and m.lu_le is null;
$$;

create function public.nombre_non_lus()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.messages m
  join public.conversations c on c.id = m.conversation
  where auth.uid() in (c.acheteur, c.vendeur)
    and m.auteur <> auth.uid()
    and m.lu_le is null;
$$;

revoke execute on function public.ouvrir_conversation(uuid) from public, anon;
revoke execute on function public.marquer_lu(uuid) from public, anon;
revoke execute on function public.nombre_non_lus() from public, anon;
grant execute on function public.ouvrir_conversation(uuid) to authenticated;
grant execute on function public.marquer_lu(uuid) to authenticated;
grant execute on function public.nombre_non_lus() to authenticated;

-- Signalements ---------------------------------------------------------------

create type public.motif_signalement as enum ('arnaque', 'interdit', 'contenu_choquant', 'doublon', 'mauvaise_categorie', 'autre');
create type public.statut_signalement as enum ('ouvert', 'traite', 'rejete');

create table public.signalements (
  id bigint generated always as identity primary key,
  auteur uuid references public.profils (id) on delete set null,
  annonce uuid references public.annonces (id) on delete cascade,
  membre uuid references public.profils (id) on delete cascade,
  motif public.motif_signalement not null,
  details text check (details is null or char_length(details) <= 1000),
  statut public.statut_signalement not null default 'ouvert',
  cree_le timestamptz not null default now(),
  traite_par uuid references public.profils (id) on delete set null,
  traite_le timestamptz,
  check (annonce is not null or membre is not null)
);

create index signalements_ouverts on public.signalements (statut, cree_le);

alter table public.signalements enable row level security;
revoke select, insert, update, delete on public.signalements from anon, authenticated;
grant select on public.signalements to authenticated;
grant insert (auteur, annonce, membre, motif, details) on public.signalements to authenticated;

create policy "signaler"
  on public.signalements for insert to authenticated
  with check (auteur = (select auth.uid()));

create policy "voir ses signalements ou modérer"
  on public.signalements for select to authenticated
  using (
    auteur = (select auth.uid())
    or public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[])
  );

-- Un même membre ne signale pas deux fois la même annonce tant que c'est ouvert
create unique index signalements_uniques on public.signalements (auteur, annonce) where statut = 'ouvert';

-- Modération -----------------------------------------------------------------
-- Toutes les actions passent par ces fonctions, qui vérifient le rôle et journalisent.

create function public.exiger_moderation()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[]) then
    raise exception 'Action réservée à la modération' using errcode = '42501';
  end if;
end;
$$;

create function public.moderer_annonce(id_annonce uuid, masquer boolean, motif text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exiger_moderation();
  update public.annonces
  set moderation = case when masquer then 'masquee' else 'visible' end::public.moderation_annonce
  where id = id_annonce;
  if not found then
    raise exception 'Annonce introuvable' using errcode = 'P0002';
  end if;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), case when masquer then 'annonce_masquee' else 'annonce_reaffichee' end,
          'annonce', id_annonce::text, jsonb_build_object('motif', motif));
end;
$$;

create function public.supprimer_annonce_moderation(id_annonce uuid, motif text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titre text;
begin
  perform public.exiger_moderation();
  delete from public.annonces where id = id_annonce returning titre into v_titre;
  if v_titre is null then
    raise exception 'Annonce introuvable' using errcode = 'P0002';
  end if;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), 'annonce_supprimee', 'annonce', id_annonce::text,
          jsonb_build_object('titre', v_titre, 'motif', motif));
end;
$$;

create function public.traiter_signalement(id_signalement bigint, decision public.statut_signalement)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exiger_moderation();
  if decision = 'ouvert' then
    raise exception 'Décision invalide' using errcode = '22023';
  end if;
  update public.signalements
  set statut = decision, traite_par = auth.uid(), traite_le = now()
  where id = id_signalement;
  if not found then
    raise exception 'Signalement introuvable' using errcode = 'P0002';
  end if;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), 'signalement_' || decision::text, 'signalement', id_signalement::text, '{}'::jsonb);
end;
$$;

create function public.bloquer_membre(id_membre uuid, bloquer boolean, motif text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exiger_moderation();
  if id_membre = auth.uid() then
    raise exception 'Vous ne pouvez pas vous bloquer vous-même' using errcode = '22023';
  end if;
  -- Un modérateur ne peut pas bloquer un administrateur
  if exists (select 1 from public.profils where id = id_membre and role = 'administrateur')
     and not public.a_le_role(array['administrateur']::public.role_utilisateur[]) then
    raise exception 'Action réservée aux administrateurs' using errcode = '42501';
  end if;
  update public.profils set bloque = bloquer where id = id_membre;
  if not found then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (auth.uid(), case when bloquer then 'membre_bloque' else 'membre_debloque' end,
          'profil', id_membre::text, jsonb_build_object('motif', motif));
end;
$$;

-- Liste des membres pour la modération (rôle et blocage ne sont pas lisibles autrement)
create function public.membres_moderation(recherche text default null)
returns table (id uuid, pseudo text, role public.role_utilisateur, bloque boolean, cree_le timestamptz, nb_annonces bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.exiger_moderation();
  return query
    select p.id, p.pseudo, p.role, p.bloque, p.cree_le,
           (select count(*) from public.annonces a where a.vendeur = p.id)
    from public.profils p
    where recherche is null or p.pseudo ilike '%' || replace(replace(recherche, '%', '\%'), '_', '\_') || '%'
    order by p.cree_le desc
    limit 50;
end;
$$;

revoke execute on function public.exiger_moderation() from public, anon;
revoke execute on function public.moderer_annonce(uuid, boolean, text) from public, anon;
revoke execute on function public.supprimer_annonce_moderation(uuid, text) from public, anon;
revoke execute on function public.traiter_signalement(bigint, public.statut_signalement) from public, anon;
revoke execute on function public.bloquer_membre(uuid, boolean, text) from public, anon;
revoke execute on function public.membres_moderation(text) from public, anon;
grant execute on function public.exiger_moderation() to authenticated;
grant execute on function public.moderer_annonce(uuid, boolean, text) to authenticated;
grant execute on function public.supprimer_annonce_moderation(uuid, text) to authenticated;
grant execute on function public.traiter_signalement(bigint, public.statut_signalement) to authenticated;
grant execute on function public.bloquer_membre(uuid, boolean, text) to authenticated;
grant execute on function public.membres_moderation(text) to authenticated;

-- Un compte bloqué ne peut plus publier (déjà vérifié par peut_publier)
-- et ses annonces disparaissent des résultats publics.
drop policy "annonces visibles" on public.annonces;
create policy "annonces visibles"
  on public.annonces for select
  to anon, authenticated
  using (
    (moderation = 'visible' and not public.est_bloque(vendeur))
    or vendeur = (select auth.uid())
    or public.a_le_role(array['moderateur', 'administrateur']::public.role_utilisateur[])
  );

-- Suppression de son propre compte -------------------------------------------
-- Supprime le compte de connexion ; profils, annonces, messages et favoris suivent en cascade.
create function public.supprimer_mon_compte()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if exists (select 1 from public.profils where id = v_id and role = 'administrateur')
     and (select count(*) from public.profils where role = 'administrateur') = 1 then
    raise exception 'Nommez un autre administrateur avant de supprimer ce compte' using errcode = '22023';
  end if;
  insert into public.journal_audit (acteur, action, cible_type, cible_id, details)
  values (null, 'compte_supprime', 'profil', v_id::text, '{}'::jsonb);
  delete from auth.users where id = v_id;
end;
$$;

revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
