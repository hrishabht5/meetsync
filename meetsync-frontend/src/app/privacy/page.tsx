export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#0f1117] text-zinc-300 py-16 px-6 sm:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 pb-8 border-b border-[#2e3248]">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p>
            Welcome to MeetSync. We are committed to protecting your personal data and ensuring transparency about how we collect, use, and share information. This policy complies with global privacy standards, including the GDPR and CCPA.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Data We Collect</h2>
          <h3 className="text-xl font-medium text-white mt-4">For Hosts (Account Holders):</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>OAuth Data:</strong> We access your Google Calendar to schedule events. We store your basic profile info (email, name) and OAuth access tokens securely via Supabase.</li>
            <li><strong>Availability Settings:</strong> Your working hours and timezone configurations.</li>
          </ul>
          
          <h3 className="text-xl font-medium text-white mt-4">For Guests (Attendees):</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Booking Information:</strong> Your name, email, and meeting notes.</li>
            <li><strong>Custom Answers:</strong> Any explicit answers provided during the booking flow.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. How We Use Your Data</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>To generate and manage Google Meet events.</li>
            <li>To send automated notifications and webhook payloads on behalf of the host.</li>
            <li>To prevent fraud, abuse, and secure our API endpoints.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Your Rights (GDPR & CCPA)</h2>
          <p>Depending on your location, you hold specific rights regarding your data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Erasure (Right to be Forgotten):</strong> Hosts can permanently delete their accounts and revoke all Google OAuth access directly from their Dashboard.</li>
            <li><strong>Right to Access & Rectification:</strong> You may request a copy of your stored data or update inaccurate details.</li>
          </ul>
          <p>To exercise these rights securely, please contact the host of the meeting or reach out to MeetSync Support.</p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Security</h2>
          <p>We leverage industry-standard security measures (HTTPS, Supabase RLS, encryption at rest for tokens) to ensure your data stays private and protected from unauthorized access.</p>
        </section>
      </div>
    </main>
  );
}
