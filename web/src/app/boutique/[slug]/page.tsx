import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CarteAnnonce } from "@/components/CarteAnnonce";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { SELECTION_CARTE, versCarte } from "@/lib/annonces";
import { URL_SITE } from "@/lib/site";
import { creerClientServeur } from "@/lib/supabase/serveur";

type Params = { params: Promise<{ slug: string }> };

const ADRESSE_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const chargerBoutique = cache(async (slug: string) => {
  if (!ADRESSE_VALIDE.test(slug) || slug.length > 60) return null;
  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("profils")
    .select("id, pseudo, ville, cree_le, boutique_nom, boutique_slug, boutique_description")
    .eq("boutique_slug", slug)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const boutique = await chargerBoutique((await params).slug);
  if (!boutique?.boutique_nom) return { title: "Boutique introuvable", robots: { index: false } };
  const description = (
    boutique.boutique_description ??
    `Les objets d'occasion de ${boutique.boutique_nom}${boutique.ville ? ` à ${boutique.ville}` : ""}, sur Troqly.`
  ).slice(0, 160);
  return {
    title: boutique.boutique_nom,
    description,
    alternates: { canonical: `/boutique/${boutique.boutique_slug}` },
    openGraph: { type: "website", title: boutique.boutique_nom, description, url: `/boutique/${boutique.boutique_slug}` },
  };
}

export default async function PageBoutique({ params }: Params) {
  const boutique = await chargerBoutique((await params).slug);
  if (!boutique?.boutique_nom) notFound();

  const supabase = await creerClientServeur();
  const [{ data }, { count: vendus }] = await Promise.all([
    supabase
      .from("annonces")
      .select(SELECTION_CARTE)
      .eq("vendeur", boutique.id)
      .eq("moderation", "visible")
      .neq("statut", "vendue")
      .order("cree_le", { ascending: false })
      .limit(60),
    supabase
      .from("annonces")
      .select("id", { count: "exact", head: true })
      .eq("vendeur", boutique.id)
      .eq("moderation", "visible")
      .eq("statut", "vendue"),
  ]);
  const annonces = (data ?? []).map(versCarte);
  const depuis = new Date(boutique.cree_le).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: boutique.boutique_nom,
    description: boutique.boutique_description ?? undefined,
    url: `${URL_SITE}/boutique/${boutique.boutique_slug}`,
    address: boutique.ville ? { "@type": "PostalAddress", addressLocality: boutique.ville, addressCountry: "FR" } : undefined,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <EnTete />
      <main id="contenu" className="mx-auto grid w-full max-w-[75rem] flex-1 content-start gap-8 px-4 pt-7 pb-20 sm:pt-10">
        <header className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-6">
          <span
            className="grid size-16 place-items-center rounded-full bg-champ font-titre text-2xl font-semibold text-sur-champ uppercase sm:size-20 sm:text-3xl"
            aria-hidden="true"
          >
            {boutique.boutique_nom.slice(0, 1)}
          </span>
          <div className="grid gap-2">
            <h1 className="font-titre text-[2rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-[2.5rem]">
              {boutique.boutique_nom}
            </h1>
            <p className="text-sm text-mauve">
              Tenue par {boutique.pseudo}
              {boutique.ville ? ` · ${boutique.ville}` : ""} · sur Troqly depuis {depuis}
            </p>
            {boutique.boutique_description && (
              <p className="max-w-[62ch] whitespace-pre-line text-prune-nuit">{boutique.boutique_description}</p>
            )}
          </div>
        </header>

        <section aria-labelledby="titre-boutique" className="grid gap-5 border-t border-ligne pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="titre-boutique" className="font-titre text-xl font-semibold text-prune-nuit">
              {annonces.length} objet{annonces.length > 1 ? "s" : ""} en vente
            </h2>
            {Boolean(vendus) && (
              <p className="text-sm text-mauve">
                {vendus} déjà vendu{vendus! > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {annonces.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {annonces.map((a, i) => (
                <CarteAnnonce key={a.id} annonce={a} prioritaire={i < 2} />
              ))}
            </div>
          ) : (
            <p className="text-mauve">Rien en vente pour le moment. Revenez bientôt.</p>
          )}
        </section>

        <Link href="/annonces" className="text-sm font-semibold text-prune hover:underline">
          Voir toutes les annonces de Troqly
        </Link>
      </main>
      <PiedDePage />
    </div>
  );
}
