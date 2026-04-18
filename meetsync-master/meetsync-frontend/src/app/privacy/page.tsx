import Link from "next/link";
import { LegalLayout, LegalSection, LegalList, SubHeading, Callout } from "@/components/LegalLayout";

export const metadata = { title: "Privacy Policy — DraftMeet" };

const SECTIONS = [
  { id: "intro",       num: 1, title: "Introduction" },
  { id: "data",        num: 2, title: "Data We Collect" },
  { id: "use",         num: 3, title: "How We Use Your Data" },
  { id: "rights",      num: 4, title: "Your Rights" },
  { id: "security",    num: 5, title: "Security" },
  { id: "google",      num: 6, title: "Google API Disclosure" },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      badge="Privacy"
      lastUpdated="April 18, 2026"
      sections={SECTIONS}
      otherPage={{ href: "/terms", label: "Terms of Service" }}
    >

      <LegalSection id="intro" num={1} title="Introduction">
        <p>
          Welcome to DraftMeet. We are committed to protecting your personal data and ensuring
          full transparency about how we collect, use, and share information.
        </p>
        <Callout variant="info">
          This policy complies with global privacy standards including the{" "}
          <strong style={{ color: "var(--text-primary)" }}>GDPR</strong> and{" "}
          <strong style={{ color: "var(--text-primary)" }}>CCPA</strong>.
        </Callout>
      </LegalSection>

      <LegalSection id="data" num={2} title="Data We Collect">
        <SubHeading>For Hosts (Account Holders)</SubHeading>
        <LegalList
          items={[
            <>
              <strong style={{ color: "var(--text-primary)" }}>OAuth Data:</strong> We access
              your Google Calendar to manage bookings and check availability. We store your
              basic profile info (email, name) and OAuth access tokens securely via Supabase.
            </>,
            <>
              <strong style={{ color: "var(--text-primary)" }}>Calendar Scopes:</strong> We
              request access to{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: "var(--bg-card-hover)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  color: "var(--accent-cyan)",
                }}
              >
                auth/calendar.events
              </code>{" "}
              (to create/edit bookings) and{" "}
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: "var(--bg-card-hover)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  color: "var(--accent-cyan)",
                }}
              >
                auth/calendar.freebusy
              </code>{" "}
              (to prevent scheduling conflicts).
            </>,
            <>
              <strong style={{ color: "var(--text-primary)" }}>Availability Settings:</strong>{" "}
              Your working hours, slot configuration, and timezone.
            </>,
          ]}
        />

        <SubHeading>For Guests (Attendees)</SubHeading>
        <LegalList
          items={[
            <>
              <strong style={{ color: "var(--text-primary)" }}>Booking Information:</strong>{" "}
              Your name, email, and any meeting notes you provide.
            </>,
            <>
              <strong style={{ color: "var(--text-primary)" }}>Custom Answers:</strong> Any
              explicit answers provided during the booking flow (e.g. custom intake questions
              set by the host).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection id="use" num={3} title="How We Use Your Data">
        <LegalList
          items={[
            "To generate and manage Google Meet events for confirmed bookings.",
            "To check your availability (Free/Busy status) to prevent double-bookings.",
            "To send automated notifications and webhook payloads on behalf of the host.",
            "To prevent fraud, abuse, and to secure our API endpoints.",
            "We do not sell, rent, or share your personal data with third parties for marketing.",
          ]}
        />
      </LegalSection>

      <LegalSection id="rights" num={4} title="Your Rights (GDPR & CCPA)">
        <p>Depending on your location, you hold specific rights regarding your data:</p>

        <SubHeading>Right to Erasure (Right to be Forgotten)</SubHeading>
        <p>
          Hosts can permanently delete their account and revoke all Google OAuth access
          directly from their Dashboard. This action is immediate and irreversible.
        </p>

        <SubHeading>Right to Access & Rectification</SubHeading>
        <p>
          You may request a copy of your stored data or ask us to update inaccurate details.
        </p>

        <Callout variant="info">
          To exercise your rights, please contact the host of the meeting, or reach out to{" "}
          <strong style={{ color: "var(--text-primary)" }}>DraftMeet Support</strong> directly
          via your dashboard.
        </Callout>
      </LegalSection>

      <LegalSection id="security" num={5} title="Security">
        <p>
          We leverage industry-standard security measures to ensure your data stays private
          and protected:
        </p>
        <LegalList
          items={[
            "All data in transit is encrypted via HTTPS / TLS.",
            "OAuth tokens are stored encrypted at rest via Supabase.",
            "Row-level security (RLS) ensures users can only access their own data.",
            "Session cookies are HMAC-signed and HttpOnly.",
          ]}
        />
      </LegalSection>

      <LegalSection id="google" num={6} title="Google API Disclosure">
        <Callout variant="important">
          DraftMeet&apos;s use and transfer to any other app of information received from Google
          APIs will adhere to the{" "}
          <Link
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-cyan)", fontWeight: 600, textDecoration: "underline" }}
          >
            Google API Services User Data Policy
          </Link>
          , including the{" "}
          <strong style={{ color: "var(--text-primary)" }}>Limited Use requirements</strong>.
        </Callout>
        <p style={{ marginTop: 12 }}>
          This means we only use Google user data to provide or improve the core scheduling
          functionality of DraftMeet. We do not use Google data for advertising or to
          train AI/ML models.
        </p>
      </LegalSection>

    </LegalLayout>
  );
}
