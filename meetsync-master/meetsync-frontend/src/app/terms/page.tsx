import { LegalLayout, LegalSection, LegalList, Callout } from "@/components/LegalLayout";

export const metadata = { title: "Terms of Service — DraftMeet" };

const SECTIONS = [
  { id: "acceptance",    num: 1, title: "Acceptance of Terms" },
  { id: "service",       num: 2, title: "Description of Service" },
  { id: "third-party",   num: 3, title: "Third-Party Services" },
  { id: "acceptable",    num: 4, title: "Acceptable Use" },
  { id: "liability",     num: 5, title: "Limitation of Liability" },
  { id: "termination",   num: 6, title: "Account Termination" },
];

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      badge="Legal"
      lastUpdated="April 18, 2026"
      sections={SECTIONS}
      otherPage={{ href: "/privacy", label: "Privacy Policy" }}
    >

      <LegalSection id="acceptance" num={1} title="Acceptance of Terms">
        <p>
          By accessing or using DraftMeet (&quot;Service&quot;), you agree to be bound by these
          Terms of Service. If you disagree with any part of these terms, you may not access
          the service.
        </p>
        <Callout variant="info">
          These terms form a binding agreement between you and DraftMeet. Please read them
          carefully before using the Service.
        </Callout>
      </LegalSection>

      <LegalSection id="service" num={2} title="Description of Service">
        <p>
          DraftMeet is a scheduling infrastructure tool that allows hosts to generate booking
          links and automatically sync meetings with Google Calendar and Google Meet. The
          Service reads your availability (Free/Busy status) to prevent scheduling conflicts
          and writes confirmed bookings to your chosen calendar.
        </p>
        <p style={{ marginTop: 12 }}>
          We act as a <strong style={{ color: "var(--text-primary)" }}>data processor</strong>{" "}
          on behalf of the host — not an independent data controller for guest information.
        </p>
      </LegalSection>

      <LegalSection id="third-party" num={3} title="Third-Party Services">
        <p>
          Our Service integrates directly with Google Workspace (Google Calendar, Google Meet).
          By using DraftMeet, you also agree to be bound by Google&apos;s Terms of Service and
          Privacy Policy.
        </p>
        <Callout variant="warning">
          We are not responsible for the availability, security, or uptime of third-party
          platforms including Google Workspace.
        </Callout>
      </LegalSection>

      <LegalSection id="acceptable" num={4} title="Acceptable Use">
        <p>You agree not to misuse the Service. Specifically:</p>
        <LegalList
          items={[
            "You must not use the Service for any illegal, harmful, or abusive activities (e.g. spamming meeting invites).",
            "Hosts are responsible for handling their guests' data legally and complying with their own local privacy regulations.",
            "You must not attempt to circumvent API rate limits or security mechanisms.",
            "You must not reverse-engineer, decompile, or attempt to extract the source code of the Service.",
          ]}
        />
      </LegalSection>

      <LegalSection id="liability" num={5} title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, DraftMeet shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, including without
          limitation:
        </p>
        <LegalList
          items={[
            "Loss of profits, revenue, or anticipated savings.",
            "Loss of data or goodwill.",
            "Business interruption or loss of business opportunity.",
            "Any damages resulting from your access to or use of — or inability to access or use — the Service.",
          ]}
        />
      </LegalSection>

      <LegalSection id="termination" num={6} title="Account Termination">
        <p>
          We strongly believe in data autonomy. You may terminate your account at any time via
          your Dashboard, which will:
        </p>
        <LegalList
          items={[
            "Instantly revoke our OAuth access to your Google account.",
            "Permanently delete your availability settings and booking links.",
            "Wipe all associated guest booking records.",
          ]}
        />
        <Callout variant="important">
          We may also terminate or suspend access to the Service immediately, without prior
          notice, for conduct that violates these Terms or poses a risk to other users.
        </Callout>
      </LegalSection>

    </LegalLayout>
  );
}
