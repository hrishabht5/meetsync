import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://draftmeet.com", lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: "https://draftmeet.com/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: "https://draftmeet.com/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
