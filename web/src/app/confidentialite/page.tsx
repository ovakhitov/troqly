import type { Metadata } from "next";
import { PageEnRedaction } from "@/components/PageEnRedaction";

export const metadata: Metadata = { title: "Confidentialité | Troqly" };

export default function PageConfidentialite() {
  return <PageEnRedaction titre="Politique de confidentialité" />;
}
