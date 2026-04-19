"use client";
import { useEffect, useState } from "react";
import { api, ProfileResponse, PermanentLinkRow } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Card, Input, SectionHeader, Spinner } from "@/components/ui";
import { Avatar } from "@/components/Avatar";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [username, setUsername]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio]                 = useState("");
  const [headline, setHeadline]       = useState("");
  const [website, setWebsite]         = useState("");
  const [location, setLocation]       = useState("");
  const [avatarUrl, setAvatarUrl]     = useState("");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  // Page design
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bgImageUrl, setBgImageUrl]       = useState("");
  const [accentColor, setAccentColor]     = useState("");
  const [designSaving, setDesignSaving]   = useState(false);
  const [designSaved, setDesignSaved]     = useState(false);

  // Booking links on profile
  const [links, setLinks]           = useState<PermanentLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  // Public URL
  const [urlCopied, setUrlCopied]   = useState(false);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);

  // Danger zone
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.profiles.getMe(),
      api.profiles.listLinks({ limit: 50 }),
      api.domains.get().catch(() => null),
    ])
      .then(([p, res, domain]) => {
        setProfile(p);
        if (domain?.verified && domain.domain) setVerifiedDomain(domain.domain);
        setUsername(p.username);
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
        setHeadline(p.headline ?? "");
        setWebsite(p.website ?? "");
        setLocation(p.location ?? "");
        setAvatarUrl(p.avatar_url ?? "");
        setCoverImageUrl(p.cover_image_url ?? "");
        setBgImageUrl(p.bg_image_url ?? "");
        setAccentColor(p.accent_color ?? "");
        setLinks(res.items);
      })
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => { setLoading(false); setLinksLoading(false); });
  }, []);

  const publicUrl = profile
    ? verifiedDomain
      ? `https://${verifiedDomain}`
      : `${typeof window !== "undefined" ? window.location.origin : "https://www.draftmeet.com"}/u/${profile.username}`
    : "";

  const handleCopyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.profiles.updateMe({
        username:     username || undefined,
        display_name: displayName || undefined,
        bio:          bio || undefined,
        headline:     headline || undefined,
        website:      website || undefined,
        location:     location || undefined,
        avatar_url:   avatarUrl || null,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setSaving(false); }
  };

  const handleSaveDesign = async () => {
    setDesignSaving(true);
    try {
      const updated = await api.profiles.updateMe({
        cover_image_url: coverImageUrl || null,
        bg_image_url:    bgImageUrl || null,
        accent_color:    accentColor || null,
      });
      setProfile(updated);
      setDesignSaved(true);
      setTimeout(() => setDesignSaved(false), 2500);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setDesignSaving(false); }
  };

  const handleToggleShowOnProfile = async (link: PermanentLinkRow) => {
    try {
      const updated = await api.profiles.toggleShowOnProfile(link.id);
      setLinks((prev) => prev.map((l) => (l.id === link.id ? updated : l)));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleDeleteAccount = async () => {
    const c1 = window.confirm("Are you absolutely sure you want to delete your account? This cannot be undone.");
    if (!c1) return;
    const c2 = window.confirm("This will revoke DraftMeet's access to your Google Calendar and wipe all your data. Proceed?");
    if (!c2) return;
    setDeleting(true);
    try {
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

        {/* ── Identity ── */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-5">Identity</p>

          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[var(--border)]">
            <Avatar src={avatarUrl || profile?.avatar_url} name={displayName || username} size={72} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)]">{displayName || username}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">@{username}</p>
              {headline && <p className="text-xs text-[var(--accent)] mt-1">{headline}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Avatar URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Profile Photo URL</label>
              <input
                type="url"
                placeholder="https://example.com/photo.jpg (or leave blank to use Google profile picture)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                Your Google profile picture is used automatically when you connect Google Calendar.
              </p>
            </div>

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
            <Input
              label="Headline"
              placeholder="e.g. Product Designer at Acme Corp"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">Bio</label>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="A short description shown on your public profile…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Website"
                placeholder="https://yoursite.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <Input
                label="Location"
                placeholder="San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} loading={saving}>
                {saved ? "✓ Saved!" : "Save Profile"}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Public URL ── */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Your Public Page</p>
            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">Live</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Share this link as your digital booking card — guests can see your bio and all your active booking links.
          </p>

          <div className="flex items-center gap-2 p-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl mb-4">
            <span className="text-sm text-[var(--accent)] font-mono truncate flex-1">{publicUrl}</span>
            <button
              onClick={handleCopyUrl}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-gradient text-white font-medium hover:opacity-90 transition-all flex-shrink-0"
            >
              {urlCopied ? "✓ Copied!" : "Copy"}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg ring-1 ring-[var(--border-accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all flex-shrink-0"
            >
              Open ↗
            </a>
          </div>

          {/* Page Design */}
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Page Design</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Cover Image URL <span className="opacity-60">(HTTPS, shown at top)</span></label>
              <input
                type="url"
                placeholder="https://example.com/cover.jpg"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              />
              {coverImageUrl && (
                <img src={coverImageUrl} alt="Cover preview"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  className="mt-1 rounded-xl h-24 object-cover w-full" />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Background Image URL <span className="opacity-60">(fills page behind card)</span></label>
              <input
                type="url"
                placeholder="https://example.com/bg.jpg"
                value={bgImageUrl}
                onChange={(e) => setBgImageUrl(e.target.value)}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Accent Color <span className="opacity-60">(tints link buttons)</span></label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor || "#3B6AE8"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent"
                />
                <input
                  type="text"
                  placeholder="#3B6AE8"
                  maxLength={7}
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 w-32 font-mono transition-all"
                />
                {accentColor && (
                  <button onClick={() => setAccentColor("")} className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors">Clear</button>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-1">
              <Button onClick={handleSaveDesign} loading={designSaving}>
                {designSaved ? "✓ Saved!" : "Save Design"}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Booking Links on Profile ── */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Booking Links on Your Public Page</p>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Choose which of your permanent links appear on your public page. Only active links can be toggled.
          </p>

          {linksLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : links.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-6">
              No permanent links yet. <a href="/dashboard/links" className="text-[var(--accent)] hover:underline">Create one →</a>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${link.is_active ? "bg-green-400" : "bg-[var(--text-secondary)]"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {link.custom_title || link.event_type}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono">/{link.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {link.show_on_profile ? "Shown" : "Hidden"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={link.show_on_profile}
                      disabled={!link.is_active}
                      onClick={() => handleToggleShowOnProfile(link)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                        link.show_on_profile
                          ? "bg-gradient-to-r from-[#3b6ae8] to-[#38bfff]"
                          : "bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white border border-gray-300 shadow transition-transform duration-200 ease-in-out mt-[2px] ${
                          link.show_on_profile ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Danger Zone ── */}
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
