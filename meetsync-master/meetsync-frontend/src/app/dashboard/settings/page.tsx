"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export default function SettingsPage() {
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm(
      "Are you absolutely sure you want to delete your account? This action cannot be undone."
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "This will revoke MeetSync's access to your Google Calendar and wipe your data. Proceed?"
    );
    if (!confirm2) return;

    try {
      setDeleting(true);
      await api.account.delete();
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to delete account", e);
      alert("Error deleting account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-[#12151f] border border-[#2e3248] rounded-2xl overflow-hidden p-6 mt-8">
        <h2 className="text-red-400 font-semibold mb-2 text-lg flex items-center gap-2">
          <span className="text-xl">⚠️</span> Danger Zone
        </h2>
        <p className="text-zinc-400 text-sm mb-6">
          Permanently delete your account. This will erase your availability settings,
          booking links, API keys, and revoke our access to your Google account. Historical 
          bookings are wiped to ensure full compliance with the Right to Erasure (GDPR).
        </p>

        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            deleting 
              ? "bg-red-500/30 text-red-300 cursor-not-allowed" 
              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          }`}
        >
          {deleting ? "Deleting Account..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
}
