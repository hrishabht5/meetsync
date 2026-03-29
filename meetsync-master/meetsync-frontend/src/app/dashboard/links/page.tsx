"use client";
import { useEffect, useState } from "react";
import { api, OTLRow, EVENT_TYPES, CustomField } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, SectionHeader, Spinner } from "@/components/ui";

export default function LinksPage() {
  const [links, setLinks] = useState<OTLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [expires, setExpires] = useState("7d");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Custom fields builder
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);

  const load = async () => {
    setLoading(true);
    try { 
      const [fetchedLinks, settings] = await Promise.all([
        api.links.list(),
        api.availability.getSettings()
      ]);
      setLinks(fetchedLinks);
      if (settings.default_questions && settings.default_questions.length > 0) {
        setCustomFields(settings.default_questions);
        setShowFieldBuilder(true);
      }
    }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addField = () => {
    setCustomFields((f) => [...f, { label: "", type: "text", required: true }]);
  };

  const updateField = (idx: number, updates: Partial<CustomField>) => {
    setCustomFields((f) => f.map((field, i) => i === idx ? { ...field, ...updates } : field));
  };

  const removeField = (idx: number) => {
    setCustomFields((f) => f.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    // Validate fields
    for (const f of customFields) {
      if (!f.label.trim()) { alert("All custom questions must have a label."); return; }
      if (f.type === "dropdown" && (!f.options || f.options.length === 0)) {
        alert(`Dropdown "${f.label}" must have at least one option.`);
        return;
      }
    }

    setCreating(true);
    try {
      const link = await api.links.create({
        event_type: eventType,
        expires_in: expires,
        custom_fields: customFields.length > 0 ? customFields : undefined,
      });
      setLinks((l) => [link, ...l]);
      setCustomFields([]);
      setShowFieldBuilder(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm("Revoke this link?")) return;
    try {
      await api.links.revoke(token);
      setLinks((l) => l.map((x) => x.id === token ? { ...x, status: "revoked" as const } : x));
    } catch (e: unknown) { alert((e as Error).message); }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <SectionHeader title="One-Time Links" subtitle="Generate shareable booking links with optional custom questions" />

      {/* Create form */}
      <Card className="p-5 mb-6">
        <p className="text-sm font-semibold text-zinc-300 mb-4">Create New Link</p>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Meeting Type</label>
            <select
              value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="bg-[#12151f] border border-[#2e3248] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Expires In</label>
            <select
              value={expires} onChange={(e) => setExpires(e.target.value)}
              className="bg-[#12151f] border border-[#2e3248] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60">
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>

        {/* Custom Fields Builder */}
        <div className="border-t border-[#2e3248] pt-4">
          <button
            onClick={() => setShowFieldBuilder(!showFieldBuilder)}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mb-3 transition-colors"
          >
            {showFieldBuilder ? "▾ Hide" : "▸ Add"} Custom Questions
          </button>

          {showFieldBuilder && (
            <div className="flex flex-col gap-3 mb-4">
              {customFields.map((field, idx) => (
                <div key={idx} className="bg-[#12151f] border border-[#2e3248] rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500 font-semibold">Question {idx + 1}</span>
                    <button onClick={() => removeField(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                  <input
                    placeholder="Question label, e.g. Company Name"
                    value={field.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  />
                  <div className="flex gap-3 items-center flex-wrap">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value as CustomField["type"], options: e.target.value === "dropdown" ? [""] : undefined })}
                      className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="rounded accent-indigo-500"
                      />
                      Required
                    </label>
                  </div>

                  {/* Dropdown options */}
                  {field.type === "dropdown" && (
                    <div className="flex flex-col gap-2 pl-2 border-l-2 border-indigo-500/30">
                      <p className="text-xs text-zinc-500">Dropdown Options</p>
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
                            className="bg-[#0b0e18] border border-[#2e3248] rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none flex-1"
                          />
                          <button
                            onClick={() => {
                              const newOpts = (field.options || []).filter((_, i) => i !== optIdx);
                              updateField(idx, { options: newOpts });
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >×</button>
                        </div>
                      ))}
                      <button
                        onClick={() => updateField(idx, { options: [...(field.options || []), ""] })}
                        className="text-xs text-indigo-400 hover:text-indigo-300 self-start"
                      >+ Add Option</button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addField}
                className="self-start text-sm font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-2 bg-indigo-600/10 rounded-xl ring-1 ring-indigo-500/20 hover:ring-indigo-500/40 transition-all"
              >
                + Add Question
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} loading={creating}>Generate Link</Button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : error ? (
        <Card className="p-6 text-center text-red-400">⚠️ {error}</Card>
      ) : links.length === 0 ? (
        <EmptyState icon="🔗" title="No links yet" subtitle="Generate a one-time link to share with guests" />
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((lk) => (
            <Card key={lk.id} className="p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-zinc-300 truncate">{lk.id}</span>
                    <Badge status={lk.status}>{lk.status}</Badge>
                    {lk.custom_fields && lk.custom_fields.length > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                        {lk.custom_fields.length} custom Q{lk.custom_fields.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{lk.event_type}{lk.expires_at ? ` · Expires ${new Date(lk.expires_at).toLocaleDateString()}` : ""}</p>
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
    </>
  );
}
