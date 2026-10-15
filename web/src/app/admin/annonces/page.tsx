import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { Annonces } from "../Annonces";
import { EnTetePage, Messages } from "../ui";

export const metadata: Metadata = { title: "Annonces" };

export default async function PageAnnonces({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; ok?: string; erreur?: string }> }) {
  await exigerAdmin("/admin/annonces");
  const { filtre, q, ok, erreur } = await searchParams;
  return (
    <>
      <EnTetePage titre="Annonces" />
      <Messages ok={ok} erreur={erreur} />
      <Annonces filtre={filtre} recherche={q} />
    </>
  );
}
