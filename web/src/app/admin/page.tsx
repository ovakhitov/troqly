import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { Apercu } from "./Apercu";
import { EnTetePage, Messages } from "./ui";

export const metadata: Metadata = { title: "Tableau de bord" };

function modeTest() {
  const cle = process.env.STRIPE_SECRET_KEY;
  return !cle || /^(sk|rk)_test_/.test(cle);
}

export default async function PageAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdmin();
  const { ok, erreur } = await searchParams;
  return (
    <>
      <EnTetePage titre="Tableau de bord" badge={modeTest() ? "Test" : undefined} />
      <Messages ok={ok} erreur={erreur} />
      <Apercu />
    </>
  );
}
