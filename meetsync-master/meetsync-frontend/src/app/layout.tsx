import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://draftmeet.com"),
  title: {
    default: "DraftMeet — Smart Scheduling, Coming Soon",
    template: "%s | DraftMeet",
  },
  description: "Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. Join the waitlist for free early access.",
  keywords: ["meeting scheduler", "booking link", "Google Meet", "calendar scheduling", "Calendly alternative", "DraftMeet"],
  openGraph: {
    type: "website",
    url: "https://draftmeet.com",
    title: "DraftMeet — Smart Scheduling, Coming Soon",
    description: "Share a one-time booking link. Guests pick a slot, Google Meet is created instantly. Join the waitlist for free early access.",
    siteName: "DraftMeet",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DraftMeet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftMeet — Smart Scheduling, Coming Soon",
    description: "One-time booking links. Instant Google Meet. Free early access for waitlist members.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DraftMeet",
  applicationCategory: "BusinessApplication",
  description: "Smart scheduling with one-time booking links and Google Meet integration.",
  url: "https://draftmeet.com",
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
