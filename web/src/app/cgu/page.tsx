import type { Metadata } from "next";
import { PageEnRedaction } from "@/components/PageEnRedaction";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function PageCgu() {
  return <PageEnRedaction titre="Conditions d'utilisation" />;
}
