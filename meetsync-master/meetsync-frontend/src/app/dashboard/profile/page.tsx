"use client";
import { useEffect, useState } from "react";
import {
  api,
  ProfileResponse,
  PermanentLinkRow,
  PermanentLinkCreate,
  CustomField,
  EVENT_TYPES,
} from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from "@/components/ui";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [links, setLinks] = useState<PermanentLinkRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New link form state
  const [slug, setSlug] = useState("");
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.profiles.getMe(), api.profiles.listLinks()])
      .then(([p, l]) => {
        setProfile(p);
        setUsername(p.username);
        setDisplayName(p.display_name ?? "");
        setBio(p.bio ?? "");
        setLinks(l);
      })
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
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

  const handleCreateLink = async () => {
    if (!slug) return;
    for (const f of customFields) {
      if (!f.label.trim()) { alert("All questions must have a label."); return; }
      if (f.type === "dropdown" && (!f.options || f.options.length === 0)) {
        alert(`Dropdown "${f.label}" needs at least one option.`); return;
      }
    }
    setCreating(true);
    try {
      const payload: PermanentLinkCreate = {
        slug,
        event_type: eventType,
        custom_fields: customFields.length > 0 ? customFields : undefined,
      };
      const link = await api.profiles.createLink(payload);
      setLinks((l) => [link, ...l]);
      setSlug("");
      setCustomFields([]);
      setShowFields(false);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.profiles.toggleLink(id);
      setLinks((l) => l.map((x) => x.id === id ? updated : x));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this permanent link? All future visitors will see a 404.")) return;
    try {
      await api.profiles.deleteLink(id);
      setLinks((l) => l.filter((x) => x.id !== id));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const copyLink = (username: string, slug: string, id: string) => {
    const url = `${window.location.origin}/u/${username}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const addField = () =>
    setCustomFields((f) => [...f, { label: "", type: "text", required: true }]);

  const updateField = (idx: number, updates: Partial<CustomField>) =>
    setCustomFields((f) => f.map((field, i) => i === idx ? { ...field, ...updates } : field));

  const removeField = (idx: number) =>
    setCustomFields((f) => f.filter((_, i) => i !== idx));

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <>
      <SectionHeader title="Profile & Permanent Links" subtitle="Your public profile and reusable booking links" />

      <div className="flex flex-col gap-6">
        {/* ── Profile card ── */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Your Profile</p>
          {profile && (
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Public URL:{" "}
              <span className="font-mono text-[var(--accent-cyan)]">
                {window.location.origin}/u/{profile.username}
              </span>
            </p>
          )}
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
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none transition-all"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} loading={saving}>
                {saved ? "✓ Saved!" : "Save Profile"}
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Create permanent link ── */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Create Permanent Link</p>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-end">
              <Input
                label="Slug"
                placeholder="e.g. coffee-chat"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--text-secondary)] font-medium">Meeting Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                >
                  {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Custom fields builder */}
            <div className="border-t border-[var(--border)] pt-4">
              <button
                onClick={() => setShowFields(!showFields)}
                className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 mb-3 transition-colors"
              >
                {showFields ? "▾ Hide" : "▸ Add"} Custom Questions
              </button>

              {showFields && (
                <div className="flex flex-col gap-3 mb-4">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--text-secondary)] font-semibold">Question {idx + 1}</span>
                        <button onClick={() => removeField(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                      </div>
                      <input
                        placeholder="Question label, e.g. Company Name"
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                      />
                      <div className="flex gap-3 items-center flex-wrap">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(idx, { type: e.target.value as CustomField["type"], options: e.target.value === "dropdown" ? [""] : undefined })}
                          className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(idx, { required: e.target.checked })}
                            className="rounded accent-[var(--accent)]"
                          />
                          Required
                        </label>
                      </div>
                      {field.type === "dropdown" && (
                        <div className="flex flex-col gap-2 pl-2 border-l-2 border-[var(--accent)]/30">
                          <p className="text-xs text-[var(--text-secondary)]">Dropdown Options</p>
                          {(field.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex gap-2 items-center">
                              <input
                                placeholder={`Option ${optIdx + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(field.options || [])];
                                  newOpts[optIdx] = e.target.value;
                                  updateField(idx, { options: newOpts });
                                }}
                                className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[var(--text-secondary)] focus:outline-none flex-1"
                              />
                              <button
                                onClick={() => updateField(idx, { options: (field.options || []).filter((_, i) => i !== optIdx) })}
                                className="text-xs text-red-400 hover:text-red-300"
                              >×</button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateField(idx, { options: [...(field.options || []), ""] })}
                            className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] self-start transition-colors"
                          >+ Add Option</button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addField}
                    className="self-start text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-cyan)] px-3 py-2 bg-[var(--accent)]/10 rounded-xl ring-1 ring-[var(--accent)]/20 hover:ring-[var(--accent)]/40 transition-all"
                  >
                    + Add Question
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCreateLink} loading={creating} disabled={!slug}>Create Link</Button>
            </div>
          </div>
        </Card>

        {/* ── Existing links ── */}
        {links.length === 0 ? (
          <EmptyState icon="🔗" title="No permanent links yet" subtitle="Create a link to share a reusable booking URL" />
        ) : (
          <div className="flex flex-col gap-3">
            {links.map((lk) => (
              <Card key={lk.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge status={lk.is_active ? "active" : "expired"}>{lk.is_active ? "Active" : "Paused"}</Badge>
                      <span className="font-mono text-sm text-[var(--text-primary)]">/{profile?.username}/{lk.slug}</span>
                      {lk.custom_fields.length > 0 && (
                        <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                          {lk.custom_fields.length} custom Q{lk.custom_fields.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{lk.event_type}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {lk.is_active && profile && (
                      <Button variant="secondary" size="sm" onClick={() => copyLink(profile.username, lk.slug, lk.id)}>
                        {copied === lk.id ? "✓ Copied!" : "Copy Link"}
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => handleToggle(lk.id)}>
                      {lk.is_active ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(lk.id)}>Delete</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
