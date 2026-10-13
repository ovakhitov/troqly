import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";
import { supabaseEnv } from "@/lib/supabase/env";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Plan du site : pages publiques, catégories et annonces visibles encore en vente
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${URL_SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${URL_SITE}/annonces`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${URL_SITE}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_SITE}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
  if (!supabaseEnv()) return pages;

  const supabase = await creerClientServeur();
  const [{ data: categories }, { data: annonces }] = await Promise.all([
    supabase.from("categories").select("slug").order("ordre"),
    supabase
      .from("annonces")
      .select("id, cree_le")
      .eq("moderation", "visible")
      .neq("statut", "vendue")
      .order("cree_le", { ascending: false })
      .limit(5000),
  ]);

  return [
    ...pages,
    ...(categories ?? []).map((c: { slug: string }) => ({
      url: `${URL_SITE}/annonces?categorie=${encodeURIComponent(c.slug)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...(annonces ?? []).map((a: { id: string; cree_le: string }) => ({
      url: `${URL_SITE}/annonces/${a.id}`,
      lastModified: new Date(a.cree_le),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
