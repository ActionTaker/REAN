import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    changeFrequency: path.startsWith("/lp") || path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : path.startsWith("/lp") ? 0.8 : 0.3,
  }));
}
