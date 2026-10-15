import type { Metadata } from "next";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { exigerAdmin } from "@/lib/admin";
import { Annonces } from "./Annonces";
import { Apercu } from "./Apercu";
import { Argent } from "./Argent";
import { Membres } from "./Membres";
import { Messages, Onglets, SECTIONS, type Section } from "./ui";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function PageAdmin({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; filtre?: string; q?: string; ok?: string; erreur?: string }>;
}) {
  await exigerAdmin();
  const { section: demandee, filtre, q, ok, erreur } = await searchParams;
  const section: Section = SECTIONS.find(([s]) => s === demandee)?.[0] ?? "apercu";

  return (
    <div className="flex min-h-screen flex-col">
      <EnTete recherche={false} />
      <main id="contenu" className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-balance text-prune-nuit">Administration</h1>
        <Onglets actif={section} />
        <Messages ok={ok} erreur={erreur} />

        {section === "apercu" && <Apercu />}
        {section === "argent" && <Argent filtre={filtre} />}
        {section === "membres" && <Membres filtre={filtre} recherche={q} />}
        {section === "annonces" && <Annonces filtre={filtre} recherche={q} />}
      </main>
      <PiedDePage />
    </div>
  );
}
