import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [""].map((route) => ({
    // url: `${siteConfig.url}${route}`,
    url: "",
    lastModified: new Date().toISOString(),
  }));

  return [...routes];
}
