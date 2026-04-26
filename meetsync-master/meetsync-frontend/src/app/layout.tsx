import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.draftmeet.com"),
  title: {
    default: "DraftMeet — Free Calendly Alternative with Google Meet",
    template: "%s | DraftMeet",
  },
  description:
    "Stop the scheduling back-and-forth. Share a link, let clients self-schedule, get a Google Meet created automatically. 17+ features, 100% free. No credit card needed.",
  keywords: [
    "free Calendly alternative",
    "scheduling tool",
    "google meet scheduler",
    "booking link generator",
    "one-time booking links",
    "free scheduling app",
    "Calendly alternative",
    "scheduling software",
    "meeting scheduler",
    "Google Meet scheduling",
    "Google Calendar sync",
    "appointment scheduling software",
    "scheduling tool for freelancers",
    "automatic Google Meet",
    "self-service scheduling",
  ],
  openGraph: {
    type: "website",
    url: "https://www.draftmeet.com",
    title: "DraftMeet — Free Calendly Alternative",
    description:
      "One-time booking links, permanent scheduling pages, automatic Google Meet — all free. Join 500+ on the waitlist.",
    siteName: "DraftMeet",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DraftMeet — Free Calendly Alternative with Automatic Google Meet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@draftmeet",
    title: "DraftMeet — Free Calendly Alternative",
    description:
      "One-time booking links, permanent scheduling pages, automatic Google Meet — all free. Join 500+ on the waitlist.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/logo-light.png",
    shortcut: "/logo-light.png",
    apple: "/logo-light.png",
  },
  robots: { index: true, follow: true },
  verification: {
    google: "2CACV__s0LZoR8P2xyPxHh0Es8GBtRtxfKI3zEJDzDo",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DraftMeet",
    url: "https://www.draftmeet.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Free Calendly alternative with automatic Google Meet link creation. One-time booking links, permanent scheduling pages, booking analytics, webhooks, and custom domains — all free.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "50",
    },
    featureList: [
      "One-time booking links",
      "Permanent booking pages with custom slug",
      "Automatic Google Meet event creation",
      "Google Calendar integration",
      "Booking analytics dashboard",
      "Webhooks and API access",
      "Working hours and availability management",
      "Custom questions per booking link",
      "Custom domains",
      "Timezone auto-detection",
      "Self-serve cancel and reschedule",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DraftMeet",
    url: "https://www.draftmeet.com",
    logo: "https://www.draftmeet.com/logo-light.png",
    sameAs: ["https://twitter.com/draftmeet"],
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="0cc2c9e9-76df-43ab-a328-e9f602ebb430"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
