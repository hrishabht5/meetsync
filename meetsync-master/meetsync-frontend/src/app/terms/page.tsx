export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-[#0f1117] text-zinc-300 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 pb-8 border-b border-[#2e3248]">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MeetSync ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
          <p>
            MeetSync is a scheduling infrastructure tool that allows hosts to generate booking links and automatically sync meetings with Google Calendar and Google Meet. The Service reads your availability (Free/Busy status) to prevent scheduling conflicts and writes confirmed bookings to your chosen calendar. We act as a data processor for the host.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. Third-Party Services</h2>
          <p>
            Our Service integrates directly with Google Workspace (Google Calendar, Google Meet). By using MeetSync, you also agree to be bound by Google's Terms of Service and Privacy Policy. We are not responsible for the availability, security, or uptime of third-party platforms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. User Responsibilities & Acceptable Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must not use the Service for any illegal, harmful, or abusive activities (e.g., spamming meeting invites).</li>
            <li>Hosts are responsible for handling their guests' data legally and complying with their own local privacy regulations.</li>
            <li>You must not attempt to circumvent API rate limits or security mechanisms.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, MeetSync shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or goodwill, resulting from your access to or use of the Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">6. Account Termination</h2>
          <p>
            We strongly believe in data autonomy. You may terminate your account at any time via your Dashboard, which will instantly revoke our OAuth access to your Google account and wipe your settings. We may also terminate or suspend access to our Service immediately, without prior notice, for conduct that violates these Terms.
          </p>
        </section>
      </div>
    </main>
  );
}
