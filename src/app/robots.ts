import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in app pages and APIs aren't useful to search engines.
      disallow: ["/api/", "/dashboard", "/analyzer", "/properties", "/compare", "/reports", "/settings"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
