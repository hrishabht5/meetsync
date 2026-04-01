import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/themeProvider";

export const metadata: Metadata = {
  title: "MeetSync — Smart Scheduling",
  description: "Schedule meetings with Google Meet instantly using smart one-time booking links.",
  verification: {
    google: "2CACV__s0LZoR8P2xyPxHh0Es8GBtRtxfKI3zEJDzDo",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
