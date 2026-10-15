import type { MetadataRoute } from "next";

const SITE = "https://dietbuddy.buildc3.tech";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/download`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
