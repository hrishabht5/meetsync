import type { Metadata } from "next";
import "./globals.css";

// Inter is imported in globals.css now
// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MeetSync — Smart Scheduling",
  description: "Schedule meetings with Google Meet instantly using smart one-time booking links.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
