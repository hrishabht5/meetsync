import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://draftmeet.app"),
  title: {
    default: "DraftMeet — Smart Scheduling",
    template: "%s | DraftMeet",
  },
  description: "Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. No accounts. No friction.",
  keywords: ["meeting scheduler", "booking link", "Google Meet", "calendar scheduling", "Calendly alternative"],
  openGraph: {
    type: "website",
    url: "https://draftmeet.app",
    title: "DraftMeet — Smart Scheduling",
    description: "Share a one-time booking link. Guests pick a slot, Google Meet is created instantly.",
    siteName: "DraftMeet",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DraftMeet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet — Smart Scheduling",
    description: "One-time booking links. Instant Google Meet. No friction.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  verification: {
    google: "2CACV__s0LZoR8P2xyPxHh0Es8GBtRtxfKI3zEJDzDo",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DraftMeet",
  applicationCategory: "BusinessApplication",
  description: "Smart scheduling with one-time booking links and Google Meet integration.",
  url: "https://draftmeet.app",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
