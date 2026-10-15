import Link from "next/link";
import { formaterPrix } from "@/lib/annonces";
import { ACTIONS } from "@/lib/journal";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { soldeStripe } from "./argent-stripe";
import { Anneau, BarresMois, type Part } from "./graphiques";
import { Carte, CarteChiffre, RangeeChiffres, TEINTES, type Teinte } from "./ui";

const MS_JOUR = 86_400_000;

// Jour au format AAAA-MM-JJ, heure de Paris
const jourParis = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const moisDe = (iso: string) => jourParis.format(new Date(iso)).slice(0, 7);
const dateActivite = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const heureActivite = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const MOTIFS: Record<string, string> = {
  arnaque: "Arnaque",
  interdit: "Objet interdit",
  contenu_choquant: "Contenu choquant",
  doublon: "Doublon",
  mauvaise_categorie: "Mauvaise catégorie",
  autre: "Autre",
};

type Commande = {
  id: string;
  titre: string;
  statut: "payee" | "terminee" | "litige" | "remboursee";
  prix_centimes: number;
  frais_service_centimes: number;
  total_centimes: number;
  mode_remise: "main_propre" | "livraison";
  essais_code: number;
  cree_le: string;
  payee_le: string | null;
  terminee_le: string | null;
  acheteur_profil: { pseudo: string } | null;
  vendeur_profil: { pseudo: string } | null;
};

type Tache = { titre: string; detail: string; teinte: Teinte; href: string };
type Evenement = { date: string; texte: string; teinte: Teinte; href?: string };

export async function Apercu() {
  const admin = creerClientAdmin();
  const maintenant = Date.now();
  const ilYa7Jours = new Date(maintenant - 7 * MS_JOUR).toISOString();
  const compter = (requete: PromiseLike<{ count: number | null }>) => requete.then((r) => r.count ?? 0);

  const [commandes, membres, nouveaux, enLigne, boostees, signalements, solde, profils, annonces, journal] = await Promise.all([
    admin
      .from("commandes")
      .select(
        "id, titre, statut, prix_centimes, frais_service_centimes, total_centimes, mode_remise, essais_code, cree_le, payee_le, terminee_le, acheteur_profil:profils!commandes_acheteur_fkey(pseudo), vendeur_profil:profils!commandes_vendeur_fkey(pseudo)",
      )
      .in("statut", ["payee", "terminee", "litige", "remboursee"])
      .order("cree_le", { ascending: false })
      .limit(2000)
      .then((r) => (r.data ?? []) as unknown as Commande[]),
    compter(admin.from("profils").select("id", { count: "exact", head: true })),
    compter(admin.from("profils").select("id", { count: "exact", head: true }).gte("cree_le", ilYa7Jours)),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("moderation", "visible").neq("statut", "vendue")),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).gt("boost_jusqua", new Date(maintenant).toISOString())),
    admin
      .from("signalements")
      .select("id, motif, cree_le, annonces(titre)")
      .eq("statut", "ouvert")
      .order("cree_le")
      .limit(20)
      .then((r) => (r.data ?? []) as unknown as { id: number; motif: string; cree_le: string; annonces: { titre: string } | null }[]),
    soldeStripe(),
    admin.from("profils").select("id, pseudo, cree_le").order("cree_le", { ascending: false }).limit(8),
    admin.from("annonces").select("id, titre, cree_le").order("cree_le", { ascending: false }).limit(8),
    admin.from("journal_audit").select("id, action, cible_type, cible_id, details, cree_le").order("cree_le", { ascending: false }).limit(8),
  ]);

  const moisCourant = jourParis.format(maintenant).slice(0, 7);
  const somme = (lignes: Commande[], champ: "frais_service_centimes" | "total_centimes" | "prix_centimes") =>
    lignes.reduce((t, c) => t + c[champ], 0);
  const terminees = commandes.filter((c) => c.statut === "terminee");
  const termineesMois = terminees.filter((c) => c.terminee_le && moisDe(c.terminee_le) === moisCourant);
  const aRemettre = commandes.filter((c) => c.statut === "payee");
  const litiges = commandes.filter((c) => c.statut === "litige");
  const rembourseesMois = commandes.filter((c) => c.statut === "remboursee" && moisDe(c.cree_le) === moisCourant);

  // Où en est l'argent
  const parts: Part[] = [
    { cle: "payee", libelle: "Payé, remise à faire", montant: somme(aRemettre, "total_centimes"), teinte: "info", href: "/admin/argent?filtre=payee" },
    { cle: "litige", libelle: "En litige", montant: somme(litiges, "total_centimes"), teinte: "alerte", href: "/admin/argent?filtre=litige" },
    { cle: "terminee", libelle: "Ventes terminées ce mois-ci", montant: somme(termineesMois, "total_centimes"), teinte: "statut", href: "/admin/argent?filtre=terminee" },
    { cle: "remboursee", libelle: "Remboursé, commandes du mois", montant: somme(rembourseesMois, "total_centimes"), teinte: "neutre", href: "/admin/argent?filtre=remboursee" },
  ];
  const miseEnAvant = litiges.length ? "litige" : aRemettre.length ? "payee" : "terminee";

  // Commissions des 6 derniers mois (date de fin de vente)
  const [annee, moisNum] = moisCourant.split("-").map(Number);
  const mois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(annee, moisNum - 1 - (5 - i), 15));
    const cle = d.toISOString().slice(0, 7);
    const ventes = terminees.filter((c) => c.terminee_le && moisDe(c.terminee_le) === cle);
    const valeur = somme(ventes, "frais_service_centimes");
    const libelle = d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
    const complet = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    return {
      cle,
      libelle,
      valeur,
      detail: `${complet} : ${formaterPrix(valeur)} de commission sur ${ventes.length} vente${ventes.length > 1 ? "s" : ""} (${formaterPrix(somme(ventes, "prix_centimes"))})`,
    };
  });

  // À faire : ce qui attend une décision, le plus urgent d'abord
  const qui = (c: Commande) => `${c.acheteur_profil?.pseudo ?? "compte supprimé"} → ${c.vendeur_profil?.pseudo ?? "compte supprimé"}`;
  const taches: Tache[] = [
    ...litiges.map((c) => ({
      titre: `Régler le litige · ${c.titre}`,
      detail: `${formaterPrix(c.total_centimes)} · ${qui(c)}`,
      teinte: "alerte" as const,
      href: "/admin/argent?filtre=litige",
    })),
    ...aRemettre
      .filter((c) => c.mode_remise === "main_propre" && c.essais_code >= 5)
      .map((c) => ({
        titre: `Débloquer le code de remise · ${c.titre}`,
        detail: `5 codes faux saisis · ${qui(c)}`,
        teinte: "abricot" as const,
        href: "/admin/argent?filtre=payee",
      })),
    ...signalements.map((s) => ({
      titre: `Examiner le signalement · ${MOTIFS[s.motif] ?? s.motif}`,
      detail: s.annonces?.titre ?? "Annonce supprimée",
      teinte: "abricot" as const,
      href: "/moderation",
    })),
    ...aRemettre
      .filter((c) => c.payee_le && maintenant - Date.parse(c.payee_le) > 14 * MS_JOUR)
      .map((c) => ({
        titre: `Relancer la remise · ${c.titre}`,
        detail: `payée il y a ${Math.floor((maintenant - Date.parse(c.payee_le!)) / MS_JOUR)} jours · ${qui(c)}`,
        teinte: "info" as const,
        href: "/admin/argent?filtre=payee",
      })),
  ];

  // Dernière activité : ventes, inscriptions, annonces et actions de l'équipe, mêlées par date
  const evenements: Evenement[] = [
    ...commandes.flatMap((c) => [
      ...(c.payee_le ? [{ date: c.payee_le, texte: `Commande payée · ${c.titre} (${formaterPrix(c.total_centimes)})`, teinte: "info" as const, href: `/commandes/${c.id}` }] : []),
      ...(c.terminee_le
        ? [{ date: c.terminee_le, texte: `Vente terminée · ${c.titre}, ${formaterPrix(c.frais_service_centimes)} de commission`, teinte: "statut" as const, href: `/commandes/${c.id}` }]
        : []),
    ]),
    ...(profils.data ?? []).map((p) => ({ date: p.cree_le, texte: `Nouveau membre · ${p.pseudo}`, teinte: "prune" as const, href: `/admin/membres/${p.id}` })),
    ...(annonces.data ?? []).map((a) => ({ date: a.cree_le, texte: `Nouvelle annonce · ${a.titre}`, teinte: "neutre" as const, href: `/annonces/${a.id}` })),
    ...(journal.data ?? []).map((j) => ({
      date: j.cree_le,
      texte: `${ACTIONS[j.action] ?? j.action}${typeof j.details?.titre === "string" ? ` · ${j.details.titre}` : typeof j.details?.pseudo === "string" ? ` · ${j.details.pseudo}` : ""}`,
      teinte: "alerte" as const,
      href: "/moderation?onglet=journal",
    })),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 8);
  return (
    <VueApercu
      chiffres={{
        commissionsMois: somme(termineesMois, "frais_service_centimes"),
        commissionsTotal: somme(terminees, "frais_service_centimes"),
        aRemettre: somme(aRemettre, "total_centimes"),
        nbARemettre: aRemettre.length,
        litiges: somme(litiges, "total_centimes"),
        nbLitiges: litiges.length,
        solde,
        membres,
        nouveaux,
        enLigne,
        boostees,
        signalements: signalements.length,
      }}
      parts={parts}
      miseEnAvant={miseEnAvant}
      mois={mois}
      taches={taches}
      evenements={evenements}
    />
  );
}

export type DonneesApercu = {
  chiffres: {
    commissionsMois: number;
    commissionsTotal: number;
    aRemettre: number;
    nbARemettre: number;
    litiges: number;
    nbLitiges: number;
    solde: { disponible: number; aVenir: number } | null;
    membres: number;
    nouveaux: number;
    enLigne: number;
    boostees: number;
    signalements: number;
  };
  parts: Part[];
  miseEnAvant: string | null;
  mois: { cle: string; libelle: string; valeur: number; detail: string }[];
  taches: Tache[];
  evenements: Evenement[];
};

// Affichage seul, séparé du chargement des données
export function VueApercu({ chiffres: c, parts, miseEnAvant, mois, taches, evenements }: DonneesApercu) {
  const aujourdhui = jourParis.format(Date.now());
  return (
    <>
      <RangeeChiffres>
        <CarteChiffre
          libelle="Commissions ce mois-ci"
          valeur={formaterPrix(c.commissionsMois)}
          detail={`${formaterPrix(c.commissionsTotal)} depuis le début`}
          teinte="prune"
          href="/admin/argent?filtre=terminee"
        />
        <CarteChiffre
          libelle="En attente de remise"
          valeur={formaterPrix(c.aRemettre)}
          detail={`${c.nbARemettre} commande${c.nbARemettre > 1 ? "s" : ""} payée${c.nbARemettre > 1 ? "s" : ""}`}
          teinte="info"
          href="/admin/argent?filtre=payee"
        />
        <CarteChiffre
          libelle="En litige"
          valeur={formaterPrix(c.litiges)}
          detail={c.nbLitiges ? `${c.nbLitiges} à régler` : "aucun litige"}
          teinte="alerte"
          href="/admin/argent?filtre=litige"
        />
        <CarteChiffre
          libelle="Solde Stripe"
          valeur={c.solde ? formaterPrix(c.solde.disponible) : "—"}
          detail={c.solde ? `disponible · ${formaterPrix(c.solde.aVenir)} à venir` : "Stripe n'est pas joignable"}
          teinte="statut"
          href="/admin/argent"
        />
      </RangeeChiffres>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Carte titre="Où en est l'argent" indication="Cliquez une part pour l'ouvrir">
          <Anneau parts={parts} miseEnAvant={miseEnAvant} />
        </Carte>
        <Carte titre="Commissions sur 6 mois" indication={`${formaterPrix(mois.reduce((t, m) => t + m.valeur, 0))} au total`}>
          <BarresMois mois={mois} />
        </Carte>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Carte titre="À faire" indication={`${taches.length} action${taches.length > 1 ? "s" : ""}`}>
          {taches.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
              {taches.slice(0, 8).map((t, i) => (
                <li key={i} className="flex items-center gap-3 rounded-champ bg-creux px-4 py-3">
                  <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${TEINTES[t.teinte].point}`} />
                  <span className="grid min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-prune-nuit sm:line-clamp-1">{t.titre}</span>
                    <span className="truncate text-xs text-mauve">{t.detail}</span>
                  </span>
                  <Link href={t.href} className={`shrink-0 rounded-[10px] px-3 py-1.5 text-xs font-semibold ${TEINTES.info.puce} hover:bg-info/20`}>
                    Ouvrir
                  </Link>
                </li>
              ))}
              {taches.length > 8 && <li className="px-1 text-xs text-mauve">et {taches.length - 8} autre(s)</li>}
            </ul>
          ) : (
            <p className="rounded-champ bg-creux px-4 py-3 text-sm text-mauve">Rien en attente : tout est à jour.</p>
          )}
        </Carte>

        <Carte titre="Dernière activité">
          {evenements.length ? (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
              {evenements.map((e, i) => {
                const jour = jourParis.format(new Date(e.date));
                const contenu = (
                  <>
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${TEINTES[e.teinte].point}`} />
                    <span className="min-w-0 flex-1 truncate text-prune-nuit">{e.texte}</span>
                    <span className="shrink-0 text-xs text-mauve tabular-nums">
                      {jour === aujourdhui ? heureActivite.format(new Date(e.date)) : dateActivite.format(new Date(e.date))}
                    </span>
                  </>
                );
                return (
                  <li key={i}>
                    {e.href ? (
                      <Link href={e.href} className="flex items-start gap-3 rounded-[8px] text-sm hover:underline">
                        {contenu}
                      </Link>
                    ) : (
                      <span className="flex items-start gap-3 text-sm">{contenu}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-mauve">Rien pour l&apos;instant.</p>
          )}
        </Carte>
      </div>

      <RangeeChiffres>
        <CarteChiffre libelle="Membres" valeur={String(c.membres)} detail={`+${c.nouveaux} ces 7 derniers jours`} teinte="prune" href="/admin/membres" />
        <CarteChiffre libelle="Annonces en ligne" valeur={String(c.enLigne)} detail="visibles sur le site" teinte="neutre" href="/admin/annonces?filtre=en_ligne" />
        <CarteChiffre libelle="Annonces boostées" valeur={String(c.boostees)} detail="en tête des résultats" teinte="abricot" href="/admin/annonces?filtre=boostees" />
        <CarteChiffre
          libelle="Signalements ouverts"
          valeur={c.signalements >= 20 ? "20+" : String(c.signalements)}
          detail="à examiner en modération"
          teinte="alerte"
          href="/moderation"
        />
      </RangeeChiffres>
    </>
  );
}
