import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

// Les pages privées (compte, messages, paiements) n'ont rien à faire dans les moteurs de recherche
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/compte",
        "/deposer",
        "/messages",
        "/moderation",
        "/admin",
        "/commandes",
        "/offres",
        "/connexion",
        "/inscription",
        "/mot-de-passe-oublie",
        "/auth/",
        "/api/",
        "/annonces/*/modifier",
      ],
    },
    sitemap: `${URL_SITE}/sitemap.xml`,
    host: URL_SITE,
  };
}
