import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/manage/",
        "/auth/",
        "/api/",
        "/login",
      ],
    },
    sitemap: "https://www.draftmeet.com/sitemap.xml",
  };
}
