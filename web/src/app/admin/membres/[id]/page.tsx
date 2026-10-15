import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { exigerAdmin, lienStripe } from "@/lib/admin";
import { formaterDateRelative, formaterPrix, libellesStatut, type StatutAnnonce } from "@/lib/annonces";
import type { StatutCommande } from "@/lib/commandes";
import { libellesGenre, type Genre } from "@/lib/genres";
import { bloquerMembre, changerRoleMembre, supprimerMembre } from "../../actions";
import { Statut } from "../../Argent";
import { bouton, boutonDanger, boutonFort, champ, Confirmer, dateCourte, Messages, Onglets, Retour, ROLES, Vide } from "../../ui";

export const metadata: Metadata = { title: "Compte membre", robots: { index: false } };

export default async function PageMembreAdmin({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const { id: moi, admin } = await exigerAdmin(`/admin/membres/${id}`);
  const { ok, erreur } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ data: profil }, { data: compte }, { data: prive }, { data: paiement }, { data: annonces }, { data: commandes }] =
    await Promise.all([
      admin.from("profils").select("pseudo, ville, role, bloque, cree_le, boutique_nom, boutique_slug").eq("id", id).maybeSingle(),
      admin.auth.admin.getUserById(id),
      admin.from("informations_privees").select("prenom, nom, genre, date_naissance, telephone").eq("id", id).maybeSingle(),
      admin.from("comptes_paiement").select("stripe_compte, versements_actifs, infos_completes").eq("membre", id).maybeSingle(),
      admin
        .from("annonces")
        .select("id, titre, prix_centimes, statut, moderation, cree_le")
        .eq("vendeur", id)
        .order("cree_le", { ascending: false })
        .limit(50),
      admin
        .from("commandes")
        .select("id, titre, statut, total_centimes, frais_service_centimes, cree_le, acheteur, vendeur")
        .or(`acheteur.eq.${id},vendeur.eq.${id}`)
        .order("cree_le", { ascending: false })
        .limit(50),
    ]);
  if (!profil) notFound();

  const utilisateur = compte?.user;
  const ventes = (commandes ?? []).filter((c) => c.vendeur === id && c.statut === "terminee");
  const achats = (commandes ?? []).filter((c) => c.acheteur === id && c.statut === "terminee");
  const retour = `/admin/membres/${id}`;
  const date = (iso?: string | null) => (iso ? dateCourte.format(new Date(iso)) : "—");

  return (
    <div className="flex min-h-screen flex-col">
      <EnTete recherche={false} />
      <main id="contenu" className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 pt-8 pb-20">
        <Onglets actif="membres" />
        <div className="grid gap-1">
          <Link href="/admin?section=membres" className="text-sm text-prune hover:underline">
            ‹ Tous les comptes
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 font-titre text-3xl font-semibold tracking-tight text-prune-nuit">
            {profil.pseudo}
            {profil.role !== "utilisateur" && (
              <span className="rounded-full border border-prune px-2.5 py-0.5 text-sm text-prune">{ROLES[profil.role]}</span>
            )}
            {profil.bloque && <span className="rounded-full border border-abricot px-2.5 py-0.5 text-sm text-abricot">Bloqué</span>}
          </h1>
        </div>
        <Messages ok={ok} erreur={erreur} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panneau titre="Compte">
            <Ligne libelle="E-mail" valeur={utilisateur?.email ?? "—"} />
            <Ligne libelle="E-mail confirmé" valeur={utilisateur?.email_confirmed_at ? "oui" : "non"} />
            <Ligne libelle="Inscrit" valeur={date(profil.cree_le)} />
            <Ligne libelle="Dernière connexion" valeur={date(utilisateur?.last_sign_in_at)} />
            <Ligne libelle="Ville" valeur={profil.ville ?? "—"} />
            <Ligne
              libelle="Boutique"
              valeur={
                profil.boutique_slug ? (
                  <Link href={`/boutique/${profil.boutique_slug}`} className="text-prune hover:underline">
                    {profil.boutique_nom}
                  </Link>
                ) : (
                  "pas encore nommée"
                )
              }
            />
          </Panneau>

          <Panneau titre="Informations privées">
            <p className="text-xs text-mauve">
              À consulter seulement pour traiter un litige, une fraude ou une demande des autorités.
            </p>
            {prive ? (
              <>
                <Ligne libelle="Nom" valeur={`${prive.prenom} ${prive.nom}`} />
                <Ligne libelle="Genre" valeur={prive.genre ? libellesGenre[prive.genre as Genre] : "—"} />
                <Ligne libelle="Naissance" valeur={new Date(`${prive.date_naissance}T12:00:00`).toLocaleDateString("fr-FR")} />
                <Ligne libelle="Téléphone" valeur={prive.telephone ?? "—"} />
              </>
            ) : (
              <p className="text-sm text-prune-nuit">Pas encore complétées : ce membre ne peut ni vendre ni acheter.</p>
            )}
          </Panneau>

          <Panneau titre="Paiements">
            {paiement ? (
              <>
                <Ligne libelle="Reçoit des paiements" valeur={paiement.versements_actifs ? "oui" : "non, activation inachevée"} />
                <Ligne libelle="Ventes terminées" valeur={`${ventes.length} · ${formaterPrix(ventes.reduce((t, c) => t + c.total_centimes, 0))}`} />
                <Ligne libelle="Commissions générées" valeur={formaterPrix(ventes.reduce((t, c) => t + c.frais_service_centimes, 0))} />
                <a href={lienStripe(`connect/accounts/${paiement.stripe_compte}`)} target="_blank" rel="noreferrer" className={`${bouton} justify-self-start`}>
                  Compte vendeur dans Stripe
                </a>
              </>
            ) : (
              <p className="text-sm text-prune-nuit">Aucun compte de paiement : ce membre n&apos;a pas activé la vente.</p>
            )}
            <Ligne libelle="Achats terminés" valeur={`${achats.length} · ${formaterPrix(achats.reduce((t, c) => t + c.total_centimes, 0))}`} />
          </Panneau>

          <Panneau titre="Actions">
            {id === moi ? (
              <p className="text-sm text-mauve">C&apos;est votre compte : gérez-le depuis « Mon compte ».</p>
            ) : (
              <>
                <form action={bloquerMembre.bind(null, id, !profil.bloque)} className="flex flex-wrap gap-2">
                  <Retour vers={retour} />
                  {!profil.bloque && (
                    <>
                      <label className="sr-only" htmlFor="motif-blocage">Motif du blocage</label>
                      <input id="motif-blocage" name="motif" placeholder="Motif du blocage" className={`${champ} flex-1`} />
                    </>
                  )}
                  <button type="submit" className={profil.bloque ? bouton : boutonFort}>
                    {profil.bloque ? "Débloquer le compte" : "Bloquer le compte"}
                  </button>
                </form>
                <p className="text-xs text-mauve">Un compte bloqué ne peut plus publier ni écrire, et ses annonces disparaissent du site.</p>

                <form action={changerRoleMembre.bind(null, id)} className="flex flex-wrap items-center gap-2">
                  <Retour vers={retour} />
                  <label htmlFor="role" className="text-xs text-prune-nuit">Rôle</label>
                  <select id="role" name="role" defaultValue={profil.role} className={champ}>
                    {Object.entries(ROLES).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button type="submit" className={bouton}>Appliquer</button>
                </form>

                <form action={supprimerMembre.bind(null, id)} className="grid gap-2 rounded-champ border border-ligne p-3">
                  <Retour vers={retour} />
                  <label className="text-xs text-prune-nuit" htmlFor="pseudo-confirme">
                    Pour supprimer ce compte, recopiez son pseudo : <strong>{profil.pseudo}</strong>
                  </label>
                  <input id="pseudo-confirme" name="pseudo" required autoComplete="off" className={champ} />
                  <label className="sr-only" htmlFor="motif-suppression">Motif de la suppression</label>
                  <input id="motif-suppression" name="motif" placeholder="Motif (journal)" className={champ} />
                  <Confirmer>
                    Je supprime définitivement ce compte, ses annonces et ses messages. Les commandes passées restent pour la comptabilité.
                  </Confirmer>
                  <button type="submit" className={`${boutonDanger} justify-self-start`}>Supprimer le compte</button>
                </form>
              </>
            )}
          </Panneau>
        </div>

        <section className="grid gap-3" aria-labelledby="titre-annonces">
          <h2 id="titre-annonces" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
            Annonces ({annonces?.length ?? 0})
          </h2>
          {annonces?.length ? (
            <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
              {annonces.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ligne p-3 last:border-b-0">
                  <Link href={`/annonces/${a.id}`} className="text-sm font-semibold text-prune hover:underline">
                    {a.titre}
                  </Link>
                  <span className="text-xs text-mauve tabular-nums">
                    {formaterPrix(a.prix_centimes)} · {libellesStatut[a.statut as StatutAnnonce]}
                    {a.moderation === "masquee" && " · masquée"} · {formaterDateRelative(a.cree_le)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Vide texte="Aucune annonce." />
          )}
        </section>

        <section className="grid gap-3" aria-labelledby="titre-commandes">
          <h2 id="titre-commandes" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
            Achats et ventes ({commandes?.length ?? 0})
          </h2>
          {commandes?.length ? (
            <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
              {commandes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne p-3 last:border-b-0">
                  <span className="grid">
                    <Link href={`/commandes/${c.id}`} className="text-sm font-semibold text-prune hover:underline">
                      {c.titre}
                    </Link>
                    <span className="text-xs text-mauve">
                      {c.vendeur === id ? "Vente" : "Achat"} · {date(c.cree_le)} · {formaterPrix(c.total_centimes)}
                    </span>
                  </span>
                  <Statut statut={c.statut as StatutCommande} />
                </li>
              ))}
            </ul>
          ) : (
            <Vide texte="Aucune commande." />
          )}
        </section>
      </main>
      <PiedDePage />
    </div>
  );
}

function Panneau({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-carte border border-ligne bg-surface p-4">
      <h2 className="font-titre text-lg font-semibold tracking-tight text-prune-nuit">{titre}</h2>
      {children}
    </section>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: React.ReactNode }) {
  return (
    <p className="flex flex-wrap justify-between gap-x-4 text-sm">
      <span className="text-mauve">{libelle}</span>
      <span className="break-all text-prune-nuit">{valeur}</span>
    </p>
  );
}
