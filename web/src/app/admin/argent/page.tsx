import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { Argent } from "../Argent";
import { EnTetePage, Messages } from "../ui";

export const metadata: Metadata = { title: "Argent" };

export default async function PageArgent({ searchParams }: { searchParams: Promise<{ filtre?: string; ok?: string; erreur?: string }> }) {
  await exigerAdmin("/admin/argent");
  const { filtre, ok, erreur } = await searchParams;
  return (
    <>
      <EnTetePage titre="Argent" />
      <Messages ok={ok} erreur={erreur} />
      <Argent filtre={filtre} />
    </>
  );
}
