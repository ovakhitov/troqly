import Link from "next/link";
import { formaterPrix } from "@/lib/annonces";
import { creerClientAdmin } from "@/lib/supabase/admin";
import { soldeStripe } from "./argent-stripe";

const MS_JOUR = 86_400_000;

type LigneCommande = {
  statut: string;
  prix_centimes: number;
  frais_service_centimes: number;
  total_centimes: number;
  payee_le: string | null;
  terminee_le: string | null;
  essais_code: number;
};

// Jour au format AAAA-MM-JJ, heure de Paris
const jourParis = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });

export async function Apercu() {
  const admin = creerClientAdmin();
  const maintenant = Date.now();
  const ilYa7Jours = new Date(maintenant - 7 * MS_JOUR).toISOString();
  const compter = (requete: PromiseLike<{ count: number | null }>) => requete.then((r) => r.count ?? 0);

  const [commandes, membres, nouveauxMembres, enLigne, masquees, boostees, signalements, solde] = await Promise.all([
    admin
      .from("commandes")
      .select("statut, prix_centimes, frais_service_centimes, total_centimes, payee_le, terminee_le, essais_code")
      .in("statut", ["payee", "terminee", "litige", "remboursee"])
      .then((r) => (r.data ?? []) as LigneCommande[]),
    compter(admin.from("profils").select("id", { count: "exact", head: true })),
    compter(admin.from("profils").select("id", { count: "exact", head: true }).gte("cree_le", ilYa7Jours)),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("moderation", "visible").neq("statut", "vendue")),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).eq("moderation", "masquee")),
    compter(admin.from("annonces").select("id", { count: "exact", head: true }).gt("boost_jusqua", new Date(maintenant).toISOString())),
    compter(admin.from("signalements").select("id", { count: "exact", head: true }).eq("statut", "ouvert")),
    soldeStripe(),
  ]);

  const debutMois = jourParis.format(maintenant).slice(0, 8) + "01";
  const terminees = commandes.filter((c) => c.statut === "terminee");
  const enCours = commandes.filter((c) => c.statut === "payee" || c.statut === "litige");
  const somme = (lignes: LigneCommande[], champ: keyof LigneCommande) => lignes.reduce((t, c) => t + Number(c[champ] ?? 0), 0);
  const commissionsMois = somme(
    terminees.filter((c) => c.terminee_le && jourParis.format(new Date(c.terminee_le)) >= debutMois),
    "frais_service_centimes",
  );

  const litiges = commandes.filter((c) => c.statut === "litige").length;
  const codesBloques = enCours.filter((c) => c.statut === "payee" && c.essais_code >= 5).length;
  const anciennes = enCours.filter((c) => c.statut === "payee" && c.payee_le && maintenant - Date.parse(c.payee_le) > 14 * MS_JOUR).length;

  const aTraiter = [
    { n: signalements, texte: "signalement(s) à examiner", href: "/moderation" },
    { n: litiges, texte: "commande(s) en litige", href: "/admin?section=argent&filtre=litige" },
    { n: codesBloques, texte: "code(s) de remise bloqué(s) après 5 essais", href: "/admin?section=argent&filtre=payee" },
    { n: anciennes, texte: "vente(s) payée(s) depuis plus de 14 jours sans remise", href: "/admin?section=argent&filtre=payee" },
  ].filter((t) => t.n > 0);

  // Ventes payées sur les 30 derniers jours, par jour
  const jours = Array.from({ length: 30 }, (_, i) => jourParis.format(maintenant - (29 - i) * MS_JOUR));
  const parJour = new Map(jours.map((j) => [j, { ventes: 0, commissions: 0 }]));
  for (const c of commandes) {
    if (!c.payee_le || c.statut === "remboursee") continue;
    const j = parJour.get(jourParis.format(new Date(c.payee_le)));
    if (j) {
      j.ventes += 1;
      j.commissions += c.frais_service_centimes;
    }
  }
  const max = Math.max(1, ...[...parJour.values()].map((j) => j.ventes));
  const ventes30 = [...parJour.values()].reduce((t, j) => t + j.ventes, 0);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="titre-argent" className="grid gap-3">
        <h2 id="titre-argent" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
          Argent
        </h2>
        <dl className="grid overflow-hidden rounded-carte border border-ligne bg-surface sm:grid-cols-2 lg:grid-cols-4">
          <Chiffre libelle="Commissions encaissées" valeur={formaterPrix(somme(terminees, "frais_service_centimes"))} detail={`dont ${formaterPrix(commissionsMois)} ce mois-ci`} />
          <Chiffre libelle="Ventes terminées" valeur={formaterPrix(somme(terminees, "prix_centimes"))} detail={`${terminees.length} vente${terminees.length > 1 ? "s" : ""}`} />
          <Chiffre
            libelle="En attente de remise"
            valeur={formaterPrix(somme(enCours, "total_centimes"))}
            detail={`${enCours.length} commande${enCours.length > 1 ? "s" : ""} payée${enCours.length > 1 ? "s" : ""}, à verser ou rembourser`}
          />
          <Chiffre
            libelle="Solde Stripe"
            valeur={solde ? formaterPrix(solde.disponible) : "—"}
            detail={solde ? `disponible, ${formaterPrix(solde.aVenir)} à venir` : "Stripe n'est pas joignable"}
          />
        </dl>
      </section>

      <section aria-labelledby="titre-site" className="grid gap-3">
        <h2 id="titre-site" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
          Le site
        </h2>
        <dl className="grid overflow-hidden rounded-carte border border-ligne bg-surface sm:grid-cols-2 lg:grid-cols-4">
          <Chiffre libelle="Membres" valeur={String(membres)} detail={`+${nouveauxMembres} ces 7 derniers jours`} href="/admin?section=membres" />
          <Chiffre libelle="Annonces en ligne" valeur={String(enLigne)} detail={`${boostees} boostée${boostees > 1 ? "s" : ""}`} href="/admin?section=annonces&filtre=en_ligne" />
          <Chiffre libelle="Annonces masquées" valeur={String(masquees)} detail="par la modération" href="/admin?section=annonces&filtre=masquees" />
          <Chiffre libelle="Signalements ouverts" valeur={String(signalements)} detail="à examiner" href="/moderation" />
        </dl>
      </section>

      <section aria-labelledby="titre-traiter" className="grid gap-3">
        <h2 id="titre-traiter" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
          À traiter
        </h2>
        {aTraiter.length ? (
          <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
            {aTraiter.map((t) => (
              <li key={t.texte} className="border-b border-ligne last:border-b-0">
                <Link href={t.href} className="flex items-baseline gap-3 p-4 text-sm text-prune-nuit hover:bg-creux">
                  <span className="font-titre text-lg font-semibold text-abricot tabular-nums">{t.n}</span>
                  {t.texte}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-carte border border-ligne bg-surface p-4 text-sm text-mauve">Rien en attente.</p>
        )}
      </section>

      <section aria-labelledby="titre-ventes" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titre-ventes" className="font-titre text-xl font-semibold tracking-tight text-prune-nuit">
            Ventes payées, 30 derniers jours
          </h2>
          <span className="text-sm text-mauve tabular-nums">{ventes30} au total</span>
        </div>
        <div className="rounded-carte border border-ligne bg-surface p-4">
          <ol className="flex h-32 items-end gap-[3px]" aria-label="Nombre de ventes par jour">
            {jours.map((j) => {
              const d = parJour.get(j)!;
              const libelle = `${new Date(`${j}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} : ${d.ventes} vente${d.ventes > 1 ? "s" : ""}, ${formaterPrix(d.commissions)} de commission`;
              return (
                <li key={j} className="flex h-full flex-1 items-end" title={libelle}>
                  <span className="sr-only">{libelle}</span>
                  <span
                    aria-hidden
                    className={`w-full rounded-t-[3px] ${d.ventes ? "bg-prune" : "bg-ligne"}`}
                    style={{ height: d.ventes ? `${Math.max(8, (d.ventes / max) * 100)}%` : "2px" }}
                  />
                </li>
              );
            })}
          </ol>
          <div className="mt-2 flex justify-between text-xs text-mauve" aria-hidden>
            <span>il y a 30 jours</span>
            <span>aujourd&apos;hui</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Chiffre({ libelle, valeur, detail, href }: { libelle: string; valeur: string; detail: string; href?: string }) {
  return (
    <div className="grid content-start gap-1 border-b border-ligne p-4 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <dt className="text-xs font-semibold text-mauve">{libelle}</dt>
      <dd className="font-titre text-2xl font-semibold tracking-tight text-prune-nuit tabular-nums">{valeur}</dd>
      <dd className="text-xs text-mauve">
        {href ? (
          <Link href={href} className="text-prune hover:underline">
            {detail}
          </Link>
        ) : (
          detail
        )}
      </dd>
    </div>
  );
}
