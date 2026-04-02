"use client";
import { useEffect, useState } from "react";
import {
  api,
  OTLRow,
  PermanentLinkRow,
  PermanentLinkCreate,
  EVENT_TYPES,
  CustomField,
  ProfileResponse,
} from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from "@/components/ui";

type Tab = "one-time" | "permanent";

// ── Shared custom-field builder ───────────────────────────────────────────────
function FieldBuilder({
  fields,
  onAdd,
  onUpdate,
  onRemove,
}: {
  fields: CustomField[];
  onAdd: () => void;
  onUpdate: (idx: number, updates: Partial<CustomField>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      {fields.map((field, idx) => (
        <div key={idx} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-semibold">Question {idx + 1}</span>
            <button onClick={() => onRemove(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
          </div>
          <input
            placeholder="Question label, e.g. Company Name"
            value={field.label}
            onChange={(e) => onUpdate(idx, { label: e.target.value })}
            className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={field.type}
              onChange={(e) =>
                onUpdate(idx, {
                  type: e.target.value as CustomField["type"],
                  options: e.target.value === "dropdown" ? [""] : undefined,
                })
              }
              className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
            >
              <option value="text">Short Text</option>
              <option value="textarea">Long Text</option>
              <option value="dropdown">Dropdown</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate(idx, { required: e.target.checked })}
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
                      onUpdate(idx, { options: newOpts });
                    }}
                    className="bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none flex-1"
                  />
                  <button
                    onClick={() => onUpdate(idx, { options: (field.options || []).filter((_, i) => i !== optIdx) })}
                    className="text-xs text-red-400 hover:text-red-300"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => onUpdate(idx, { options: [...(field.options || []), ""] })}
                className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] self-start transition-colors"
              >+ Add Option</button>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="self-start text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-cyan)] px-3 py-2 bg-[var(--accent)]/10 rounded-xl ring-1 ring-[var(--accent)]/20 hover:ring-[var(--accent)]/40 transition-all"
      >
        + Add Question
      </button>
    </div>
  );
}

// ── One-Time Links Tab ────────────────────────────────────────────────────────
function OneTimeLinksTab() {
  const [links, setLinks] = useState<OTLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [expires, setExpires] = useState("7d");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);

  useEffect(() => {
    Promise.all([api.links.list(), api.availability.getSettings()])
      .then(([fetchedLinks, settings]) => {
        setLinks(fetchedLinks);
        if (settings.default_questions && settings.default_questions.length > 0) {
          setCustomFields(settings.default_questions);
          setShowFieldBuilder(true);
        }
      })
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    for (const f of customFields) {
      if (!f.label.trim()) { alert("All custom questions must have a label."); return; }
      if (f.type === "dropdown" && (!f.options || f.options.length === 0)) {
        alert(`Dropdown "${f.label}" must have at least one option.`); return;
      }
    }
    setCreating(true);
    try {
      const link = await api.links.create({
        event_type: eventType,
        expires_in: expires,
        custom_fields: customFields.length > 0 ? customFields : undefined,
        custom_title: meetingTitle.trim() || undefined,
      });
      setLinks((l) => [link, ...l]);
      setMeetingTitle("");
      setCustomFields([]);
      setShowFieldBuilder(false);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm("Revoke this link?")) return;
    try {
      await api.links.revoke(token);
      setLinks((l) => l.map((x) => x.id === token ? { ...x, status: "revoked" as const } : x));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <Card className="p-6 text-center text-red-400">⚠️ {error}</Card>;

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Create One-Time Link</p>
        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] font-medium block mb-1.5">Meeting Title <span className="opacity-60">(optional)</span></label>
          <input
            placeholder="e.g. Discovery Call — Acme Corp"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-medium">Meeting Type</label>
            <select
              value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-medium">Expires In</label>
            <select
              value={expires} onChange={(e) => setExpires(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <button
            onClick={() => setShowFieldBuilder(!showFieldBuilder)}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 mb-3 transition-colors"
          >
            {showFieldBuilder ? "▾ Hide" : "▸ Add"} Custom Questions
          </button>
          {showFieldBuilder && (
            <FieldBuilder
              fields={customFields}
              onAdd={() => setCustomFields((f) => [...f, { label: "", type: "text", required: true }])}
              onUpdate={(idx, u) => setCustomFields((f) => f.map((x, i) => i === idx ? { ...x, ...u } : x))}
              onRemove={(idx) => setCustomFields((f) => f.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} loading={creating}>Generate Link</Button>
        </div>
      </Card>

      {links.length === 0 ? (
        <EmptyState icon="🔗" title="No links yet" subtitle="Generate a one-time link to share with guests" />
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((lk) => (
            <Card key={lk.id} className="p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-[var(--text-primary)] truncate">{lk.id}</span>
                    <Badge status={lk.status}>{lk.status}</Badge>
                    {lk.custom_fields && lk.custom_fields.length > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                        {lk.custom_fields.length} custom Q{lk.custom_fields.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {lk.custom_title ? <span className="text-[var(--text-primary)] font-medium">{lk.custom_title} · </span> : null}
                    {lk.event_type}{lk.expires_at ? ` · Expires ${new Date(lk.expires_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0">
                  {lk.booking_url && (
                    <Button variant="secondary" size="sm" onClick={() => copyLink(lk.booking_url, lk.id)}>
                      {copied === lk.id ? "✓ Copied!" : "Copy Link"}
                    </Button>
                  )}
                  {lk.status === "active" && (
                    <Button variant="danger" size="sm" onClick={() => handleRevoke(lk.id)}>Revoke</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Permanent Links Tab ───────────────────────────────────────────────────────
function PermanentLinksTab() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [links, setLinks] = useState<PermanentLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.profiles.getMe(), api.profiles.listLinks()])
      .then(([p, l]) => { setProfile(p); setLinks(l); })
      .catch((e: unknown) => alert(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
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
        custom_title: meetingTitle.trim() || undefined,
      };
      const link = await api.profiles.createLink(payload);
      setLinks((l) => [link, ...l]);
      setSlug("");
      setMeetingTitle("");
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
    if (!confirm("Delete this permanent link? Visitors will see a 404.")) return;
    try {
      await api.profiles.deleteLink(id);
      setLinks((l) => l.filter((x) => x.id !== id));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const copyLink = (slug: string, id: string) => {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}/${slug}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Create Permanent Link</p>
        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] font-medium block mb-1.5">Meeting Title <span className="opacity-60">(optional)</span></label>
          <input
            placeholder="e.g. Discovery Call — Acme Corp"
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <Input
            label="Slug"
            placeholder="e.g. coffee-chat"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-secondary)] font-medium">Meeting Type</label>
            <select
              value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <button
            onClick={() => setShowFields(!showFields)}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 mb-3 transition-colors"
          >
            {showFields ? "▾ Hide" : "▸ Add"} Custom Questions
          </button>
          {showFields && (
            <FieldBuilder
              fields={customFields}
              onAdd={() => setCustomFields((f) => [...f, { label: "", type: "text", required: true }])}
              onUpdate={(idx, u) => setCustomFields((f) => f.map((x, i) => i === idx ? { ...x, ...u } : x))}
              onRemove={(idx) => setCustomFields((f) => f.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} loading={creating} disabled={!slug}>Create Link</Button>
        </div>
      </Card>

      {links.length === 0 ? (
        <EmptyState icon="♾️" title="No permanent links yet" subtitle="Create a reusable link that never expires" />
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((lk) => (
            <Card key={lk.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge status={lk.is_active ? "active" : "expired"}>{lk.is_active ? "Active" : "Paused"}</Badge>
                    <span className="font-mono text-sm text-[var(--text-primary)]">
                      {profile ? `/${profile.username}/${lk.slug}` : `/${lk.slug}`}
                    </span>
                    {lk.custom_fields.length > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                        {lk.custom_fields.length} custom Q{lk.custom_fields.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {lk.custom_title ? <span className="text-[var(--text-primary)] font-medium">{lk.custom_title} · </span> : null}
                    {lk.event_type} · Permanent
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {lk.is_active && (
                    <Button variant="secondary" size="sm" onClick={() => copyLink(lk.slug, lk.id)}>
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
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LinksPage() {
  const [tab, setTab] = useState<Tab>("one-time");

  return (
    <>
      <SectionHeader
        title="Links"
        subtitle="Manage one-time and permanent booking links"
        action={
          <div className="flex bg-[var(--bg-card-hover)] rounded-lg p-1 ring-1 ring-[var(--border)]">
            <button
              onClick={() => setTab("one-time")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "one-time"
                  ? "bg-brand-gradient text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              One-Time
            </button>
            <button
              onClick={() => setTab("permanent")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === "permanent"
                  ? "bg-brand-gradient text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Permanent
            </button>
          </div>
        }
      />

      {tab === "one-time" ? <OneTimeLinksTab /> : <PermanentLinksTab />}
    </>
  );
}
