import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { Membres } from "../Membres";
import { EnTetePage, Messages } from "../ui";

export const metadata: Metadata = { title: "Comptes" };

export default async function PageComptes({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; ok?: string; erreur?: string }> }) {
  await exigerAdmin("/admin/membres");
  const { filtre, q, ok, erreur } = await searchParams;
  return (
    <>
      <EnTetePage titre="Comptes" />
      <Messages ok={ok} erreur={erreur} />
      <Membres filtre={filtre} recherche={q} />
    </>
  );
}
