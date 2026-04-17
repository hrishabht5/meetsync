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
    default: "DraftMeet: Free Calendly Alternative with Google Meet",
    template: "%s | DraftMeet",
  },
  description:
    "Create one-time or permanent booking links, auto-generate Google Meet events, and manage availability in one place. The Calendly alternative built for speed.",
  keywords: [
    "Calendly alternative",
    "free Calendly alternative",
    "scheduling software",
    "booking link tool",
    "one-time booking link",
    "meeting scheduler",
    "Google Meet scheduling",
    "Google Calendar sync",
    "appointment scheduling software",
    "scheduling tool for freelancers",
    "booking page creator",
    "automatic Google Meet",
    "online booking tool",
    "scheduling link",
    "self-service scheduling",
  ],
  openGraph: {
    type: "website",
    url: "https://www.draftmeet.com",
    title: "DraftMeet: Free Calendly Alternative with Google Meet",
    description:
      "Share a booking link, let clients self-schedule, and auto-create Google Meet events. No back-and-forth. Free to start — built for founders & freelancers.",
    siteName: "DraftMeet",
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet: Free Calendly Alternative with Google Meet",
    description:
      "One-time booking links. Permanent booking pages. Automatic Google Meet. The free Calendly alternative built for freelancers and founders.",
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
      "DraftMeet is a free Calendly alternative that lets you create one-time and permanent booking links, auto-generate Google Meet events, sync with Google Calendar, and view booking analytics.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free plan available" },
    featureList: [
      "One-time booking links",
      "Permanent booking pages with custom slug",
      "Automatic Google Meet event creation",
      "Google Calendar integration",
      "Booking analytics dashboard",
      "Webhooks and API access",
      "Working hours and availability management",
      "Custom questions per booking link",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DraftMeet",
    url: "https://www.draftmeet.com",
    logo: "https://www.draftmeet.com/logo-light.png",
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
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
