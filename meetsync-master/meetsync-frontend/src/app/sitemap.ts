import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://meetsync.app", lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: "https://meetsync.app/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: "https://meetsync.app/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
