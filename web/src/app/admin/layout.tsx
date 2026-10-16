import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { BarreLaterale, OngletsAdmin } from "./NavigationAdmin";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration | Troqly" }, robots: { index: false } };

// Coque du tableau de bord : barre latérale d'icônes à gauche, onglets en haut, contenu en cartes.
// Elle remplace l'en-tête et le pied de page du site.
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { id, admin } = await exigerAdmin();
  const { data: profil } = await admin.from("profils").select("pseudo").eq("id", id).maybeSingle();
  const initiales = (profil?.pseudo ?? "ad").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2) || "ad";

  return (
    <div className="coque-admin mx-auto flex w-full max-w-[96rem] gap-5 px-3 py-3 sm:px-4 lg:py-4">
      <BarreLaterale initiales={initiales} />
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <OngletsAdmin />
        <main id="contenu" className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
