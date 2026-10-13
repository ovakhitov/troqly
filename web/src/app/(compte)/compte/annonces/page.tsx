import { redirect } from "next/navigation";

// Ancienne adresse de « Mes annonces », désormais dans « Ma boutique »
export default async function PageMesAnnonces({ searchParams }: { searchParams: Promise<{ supprimee?: string }> }) {
  const { supprimee } = await searchParams;
  redirect(supprimee ? "/compte/boutique?supprimee=1" : "/compte/boutique");
}
