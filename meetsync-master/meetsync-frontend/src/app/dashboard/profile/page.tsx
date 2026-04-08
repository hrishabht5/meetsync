"use client";
import { useEffect, useState } from "react";
import { api, ProfileResponse } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Card, Input, SectionHeader, Spinner } from "@/components/ui";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.profiles.getMe()
      .then((p) => {
        setProfile(p);
        setUsername(p.username);
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
      })
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.profiles.updateMe({
        username: username || undefined,
        display_name: displayName || undefined,
        bio: bio || undefined,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    const c1 = window.confirm("Are you absolutely sure you want to delete your account? This cannot be undone.");
    if (!c1) return;
    const c2 = window.confirm("This will revoke DraftMeet's access to your Google Calendar and wipe all your data. Proceed?");
    if (!c2) return;
    try {
      setDeleting(true);
      await api.account.delete();
      window.location.href = "/";
    } catch (e: unknown) {
      alert(errMsg(e));
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Profile" subtitle="Your public identity on DraftMeet" />

      <div className="flex flex-col gap-6">
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Your Profile</p>
          <div className="flex flex-col gap-4">
            <Input
              label="Username"
              placeholder="e.g. jane-smith"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
            <Input
              label="Display Name"
              placeholder="Jane Smith"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Bio</label>
              <textarea
                rows={3}
                placeholder="A short description shown on your public profile…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none transition-all"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} loading={saving}>
                {saved ? "✓ Saved!" : "Save Profile"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <div className="bg-[var(--bg-card)] border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-red-400 font-semibold mb-2 text-base flex items-center gap-2">
            <span>⚠️</span> Danger Zone
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-5">
            Permanently delete your account. This will erase your availability settings,
            booking links, API keys, and revoke our access to your Google account.
            Historical bookings are wiped to comply with GDPR Right to Erasure.
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
            {deleting ? "Deleting Account…" : "Delete Account"}
          </button>
        </div>
      </div>
    </>
  );
}
