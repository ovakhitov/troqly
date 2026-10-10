import Link from "next/link";
import { CadreCompte } from "./CadreCompte";

// Page légale pas encore rédigée : le texte définitif doit être validé avant la mise en ligne
export function PageEnRedaction({ titre }: { titre: string }) {
  return (
    <CadreCompte titre={titre}>
      <p className="text-prune-nuit">Ce document est en cours de rédaction et sera publié avant l&apos;ouverture de Troqly.</p>
      <Link href="/" className="text-sm font-semibold text-prune hover:underline">
        Retour à l&apos;accueil
      </Link>
    </CadreCompte>
  );
}
