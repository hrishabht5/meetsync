"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  api,
  OTLRow,
  PermanentLinkRow,
  PermanentLinkCreate,
  EVENT_TYPES,
  CustomField,
  ProfileResponse,
  LinkCustomizationPayload,
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

// ── Row action menu ───────────────────────────────────────────────────────────
// Rendered via a portal at document.body so it escapes the card's stacking
// context (card-glow-hover uses will-change:transform which creates one).
function RowMenu({
  anchorRef,
  items,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  items: { label: string; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 160 });

  useLayoutEffect(() => {
    function reposition() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + window.scrollY + 4,
        left: Math.max(8, r.right + window.scrollX - 160),
        width: 160,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl py-1"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.onClick(); onClose(); }}
          className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-card-hover)]
            ${item.danger ? "text-red-400" : "text-[var(--text-primary)]"}`}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

// ── One-Time Links Tab ────────────────────────────────────────────────────────
function OneTimeLinksTab() {
  const [items, setItems] = useState<OTLRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [expires, setExpires] = useState("7d");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [customizeId, setCustomizeId] = useState<string | null>(null);
  const [customizeForm, setCustomizeForm] = useState<LinkCustomizationPayload>({});
  const [customizeSaving, setCustomizeSaving] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFieldBuilder, setShowFieldBuilder] = useState(false);
  const [showCreateCustomize, setShowCreateCustomize] = useState(false);
  const [createCustomize, setCreateCustomize] = useState<LinkCustomizationPayload>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = async (p: number, s: string, sf: string, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.links.list({ page: p, limit: 5, search: s, status: sf || undefined });
      setItems((prev) => append ? [...prev, ...res.items] : res.items);
      setTotal(res.total);
      setHasMore(res.has_more);
      setPage(p);
    } catch (e: unknown) { setError(errMsg(e)); }
    finally { if (!append) setLoading(false); else setLoadingMore(false); }
  };

  const cleanupStaleLinks = async () => {
    try {
      const [usedRes, expiredRes] = await Promise.all([
        api.links.list({ page: 1, limit: 100, status: "used" }),
        api.links.list({ page: 1, limit: 100, status: "expired" }),
      ]);
      const ids = [
        ...usedRes.items.map((l) => l.id),
        ...expiredRes.items.map((l) => l.id),
      ];
      if (ids.length > 0) await api.links.bulkAction(ids, "delete");
    } catch { /* silent — cleanup is best-effort */ }
  };

  useEffect(() => {
    // Load saved questions from localStorage
    try {
      const saved = localStorage.getItem("draftmeet_saved_questions");
      if (saved) {
        const parsed: CustomField[] = JSON.parse(saved);
        if (parsed.length > 0) { setCustomFields(parsed); setShowFieldBuilder(true); }
      }
    } catch { /* ignore */ }
    // Load saved customization from localStorage
    try {
      const savedC = localStorage.getItem("draftmeet_saved_customization");
      if (savedC) {
        const parsed: LinkCustomizationPayload = JSON.parse(savedC);
        setCreateCustomize(parsed);
        const hasAny = parsed.description || parsed.cover_image_url || parsed.bg_image_url || parsed.accent_color;
        if (hasAny) setShowCreateCustomize(true);
      }
    } catch { /* ignore */ }
    fetchPage(1, "", "", false);
    cleanupStaleLinks(); // fire-and-forget — don't block the initial list load
  }, []);

  // Auto-save questions to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("draftmeet_saved_questions", JSON.stringify(customFields)); }
    catch { /* ignore */ }
  }, [customFields]);

  // Auto-save customization to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem("draftmeet_saved_customization", JSON.stringify(createCustomize)); }
    catch { /* ignore */ }
  }, [createCustomize]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setSelected(new Set());
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPage(1, val, statusFilter, false), 300);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setSelected(new Set());
    fetchPage(1, search, val, false);
  };

  const handleLoadMore = () => fetchPage(page + 1, search, statusFilter, true);

  const handleCreate = async () => {
    for (const f of customFields) {
      if (!f.label.trim()) { alert("All custom questions must have a label."); return; }
      if (f.type === "dropdown" && (!f.options || f.options.length === 0)) {
        alert(`Dropdown "${f.label}" must have at least one option.`); return;
      }
    }
    setCreating(true);
    try {
      const newLink = await api.links.create({
        event_type: eventType,
        expires_in: expires,
        custom_fields: customFields.length > 0 ? customFields : undefined,
        custom_title: meetingTitle.trim() || undefined,
        description: createCustomize.description || undefined,
        cover_image_url: createCustomize.cover_image_url || undefined,
        bg_image_url: createCustomize.bg_image_url || undefined,
        accent_color: createCustomize.accent_color || undefined,
      });
      setMeetingTitle("");
      // Close modal and refresh list
      setShowCreateModal(false);
      fetchPage(1, search, statusFilter, false);
      // Auto-copy the booking URL to clipboard
      if (newLink?.booking_url) {
        navigator.clipboard.writeText(newLink.booking_url).catch(() => {});
        setCopied(newLink.id);
        setTimeout(() => setCopied(null), 3000);
      }
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (token: string) => {
    if (!confirm("Revoke this link?")) return;
    try {
      await api.links.revoke(token);
      setItems((l) => l.map((x) => x.id === token ? { ...x, status: "revoked" as const } : x));
      setSelected((s) => { const n = new Set(s); n.delete(token); return n; });
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleDelete = async (token: string) => {
    if (!confirm("Permanently delete this link? This cannot be undone.")) return;
    try {
      await api.links.deletePermanently(token);
      setItems((l) => l.filter((x) => x.id !== token));
      setTotal((t) => t - 1);
      setSelected((s) => { const n = new Set(s); n.delete(token); return n; });
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleCustomizeSave = async (token: string) => {
    setCustomizeSaving(true);
    try {
      const updated = await api.links.customize(token, customizeForm);
      setItems((l) => l.map((x) => x.id === token ? { ...x, ...updated } : x));
      setCustomizeId(null);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCustomizeSaving(false); }
  };

  const handleBulkRevoke = async () => {
    const tokens = Array.from(selected);
    if (!confirm(`Revoke ${tokens.length} link(s)?`)) return;
    try {
      const res = await api.links.bulkAction(tokens, "revoke");
      setItems((l) => l.map((x) => tokens.includes(x.id) ? { ...x, status: "revoked" as const } : x));
      setSelected(new Set());
      if (res.skipped > 0) alert(`${res.succeeded} revoked, ${res.skipped} skipped.`);
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleBulkDelete = async () => {
    const tokens = Array.from(selected);
    if (!confirm(`Permanently delete ${tokens.length} link(s)?`)) return;
    try {
      await api.links.bulkAction(tokens, "delete");
      fetchPage(1, search, statusFilter, false);
      setSelected(new Set());
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected = items.length > 0 && items.every((x) => selected.has(x.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((x) => x.id)));

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <Card className="p-6 text-center text-red-400">⚠️ {error}</Card>;

  const createFormJSX = (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-[var(--text-secondary)] font-medium block mb-1.5">Meeting Title <span className="opacity-60">(optional)</span></label>
        <input
          placeholder="e.g. Discovery Call — Acme Corp"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
        />
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-secondary)] font-medium">Meeting Type</label>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
            {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-secondary)] font-medium">Expires In</label>
          <select value={expires} onChange={(e) => setExpires(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50">
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>
      <div className="border-t border-[var(--border)] pt-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFieldBuilder(!showFieldBuilder)}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 transition-colors">
            {showFieldBuilder ? "▾ Hide" : "▸ Add"} Custom Questions
            {customFields.length > 0 && (
              <span className="ml-1 text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">{customFields.length} saved</span>
            )}
          </button>
          {customFields.length > 0 && (
            <button onClick={() => { setCustomFields([]); setShowFieldBuilder(false); }}
              className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors">Clear all</button>
          )}
        </div>
        {showFieldBuilder && (
          <FieldBuilder
            fields={customFields}
            onAdd={() => setCustomFields((f) => [...f, { label: "", type: "text", required: true }])}
            onUpdate={(idx, u) => setCustomFields((f) => f.map((x, i) => i === idx ? { ...x, ...u } : x))}
            onRemove={(idx) => setCustomFields((f) => f.filter((_, i) => i !== idx))}
          />
        )}
      </div>
      <div className="border-t border-[var(--border)] pt-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowCreateCustomize(!showCreateCustomize)}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 transition-colors">
            {showCreateCustomize ? "▾ Hide" : "▸ Set"} Page Customization
            {(createCustomize.description || createCustomize.cover_image_url || createCustomize.bg_image_url || createCustomize.accent_color) && (
              <span className="ml-1 text-xs bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30 px-2 py-0.5 rounded-full">saved</span>
            )}
          </button>
          {(createCustomize.description || createCustomize.cover_image_url || createCustomize.bg_image_url || createCustomize.accent_color) && (
            <button onClick={() => { setCreateCustomize({}); setShowCreateCustomize(false); }}
              className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors">Clear</button>
          )}
        </div>
        {showCreateCustomize && (
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Description <span className="opacity-60">(shown on booking page)</span></label>
              <textarea rows={2} maxLength={1000} placeholder="e.g. Book a 30-minute intro call…"
                value={createCustomize.description ?? ""}
                onChange={(e) => setCreateCustomize((f) => ({ ...f, description: e.target.value || null }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Cover Image URL <span className="opacity-60">(HTTPS)</span></label>
              <input type="url" placeholder="https://example.com/cover.jpg"
                value={createCustomize.cover_image_url ?? ""}
                onChange={(e) => setCreateCustomize((f) => ({ ...f, cover_image_url: e.target.value || null }))}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              />
              {createCustomize.cover_image_url && (
                <img src={createCustomize.cover_image_url} alt="Cover preview"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  className="mt-1 rounded-lg h-24 object-cover w-full" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Background Image URL <span className="opacity-60">(HTTPS, fills page behind card)</span></label>
                <input type="url" placeholder="https://example.com/bg.jpg"
                  value={createCustomize.bg_image_url ?? ""}
                  onChange={(e) => setCreateCustomize((f) => ({ ...f, bg_image_url: e.target.value || null }))}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
                {createCustomize.bg_image_url && (
                  <img src={createCustomize.bg_image_url} alt="Background preview"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="mt-1 rounded-lg h-20 object-cover w-full" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Accent Color <span className="opacity-60">(button color)</span></label>
                <div className="flex items-center gap-3">
                  <input type="color" value={createCustomize.accent_color ?? "#3B6AE8"}
                    onChange={(e) => setCreateCustomize((f) => ({ ...f, accent_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent" />
                  <input type="text" placeholder="#3B6AE8" maxLength={7}
                    value={createCustomize.accent_color ?? ""}
                    onChange={(e) => setCreateCustomize((f) => ({ ...f, accent_color: e.target.value || null }))}
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 w-32 font-mono" />
                </div>
              </div>
            </div>
          )}
        </div>

      <div className="flex justify-end">
        <Button onClick={handleCreate} loading={creating}>Generate Link</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5" onClick={() => setMenuOpenId(null)}>
      {/* Header row with "+ New Link" button */}
      <div className="flex justify-end">
        <Button onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }}>+ New Link</Button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search by ID, type or title…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 min-w-[180px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="used">Used</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>
        <span className="text-xs text-[var(--text-secondary)]">{total} total</span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState icon="🔗" title="No links found" subtitle={search || statusFilter ? "Try adjusting your filters" : "Generate a one-time link to share with guests"} />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Select-all header */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-[var(--text-secondary)]">Select all on this page</span>
          </div>

          {items.map((lk) => (
            <Card key={lk.id} className="p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={selected.has(lk.id)}
                  onChange={() => toggleSelect(lk.id)}
                  className="rounded accent-[var(--accent)] w-4 h-4 cursor-pointer flex-shrink-0"
                />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-[var(--text-primary)] truncate">{lk.id}</span>
                    <Badge status={lk.status}>{lk.status}</Badge>
                    {lk.custom_fields && lk.custom_fields.length > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                        {lk.custom_fields.length} Q{lk.custom_fields.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {lk.custom_title ? <span className="text-[var(--text-primary)] font-medium">{lk.custom_title} · </span> : null}
                    {lk.event_type}{lk.expires_at ? ` · Expires ${new Date(lk.expires_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    ref={(el) => { if (el) menuBtnRefs.current.set(lk.id, el); else menuBtnRefs.current.delete(lk.id); }}
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === lk.id ? null : lk.id); }}
                    className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                  >⋮</button>
                  {menuOpenId === lk.id && (
                    <RowMenu
                      anchorRef={{ current: menuBtnRefs.current.get(lk.id) ?? null }}
                      onClose={() => setMenuOpenId(null)}
                      items={[
                        ...(lk.booking_url ? [{ label: copied === lk.id ? "✓ Copied!" : "Copy URL", onClick: () => copyLink(lk.booking_url, lk.id) }] : []),
                        { label: embedId === lk.id ? "Hide Embed" : "Embed Code", onClick: () => setEmbedId(embedId === lk.id ? null : lk.id) },
                        { label: customizeId === lk.id ? "Hide Customize" : "Customize", onClick: () => {
                          if (customizeId === lk.id) { setCustomizeId(null); return; }
                          setCustomizeId(lk.id);
                          setCustomizeForm({ description: lk.description ?? "", cover_image_url: lk.cover_image_url ?? "", bg_image_url: lk.bg_image_url ?? "", accent_color: lk.accent_color ?? "" });
                        }},
                        ...(lk.status === "active" ? [{ label: "Revoke", onClick: () => handleRevoke(lk.id), danger: true }] : []),
                        ...(lk.status !== "active" ? [{ label: "Delete", onClick: () => handleDelete(lk.id), danger: true }] : []),
                      ]}
                    />
                  )}
                </div>
              </div>
              {embedId === lk.id && (
                <div className="mt-3 bg-[var(--bg-deep)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-2 font-semibold">Paste this into any webpage:</p>
                  <pre className="text-xs text-[var(--accent-cyan)] whitespace-pre-wrap break-all leading-relaxed">{`<script src="https://draftmeet.com/embed.js"\n        data-token="${lk.id}"></script>`}</pre>
                  <button
                    className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] transition-colors"
                    onClick={() => navigator.clipboard.writeText(`<script src="https://draftmeet.com/embed.js"\n        data-token="${lk.id}"></script>`)}
                  >
                    Copy snippet
                  </button>
                </div>
              )}
              {customizeId === lk.id && (
                <div className="mt-3 bg-[var(--bg-deep)] rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Page Customization</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Description <span className="opacity-60">(optional, shown on booking page)</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Book a 30-minute intro call to discuss your project…"
                      value={customizeForm.description ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, description: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Cover Image URL <span className="opacity-60">(HTTPS only)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/cover.jpg"
                      value={customizeForm.cover_image_url ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, cover_image_url: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                    />
                    {customizeForm.cover_image_url && (
                      <img
                        src={customizeForm.cover_image_url}
                        alt="Cover preview"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="mt-1 rounded-lg h-24 object-cover w-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Background Image URL <span className="opacity-60">(HTTPS only, fills page behind card)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/bg.jpg"
                      value={customizeForm.bg_image_url ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, bg_image_url: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                    />
                    {customizeForm.bg_image_url && (
                      <img
                        src={customizeForm.bg_image_url}
                        alt="Background preview"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="mt-1 rounded-lg h-20 object-cover w-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Accent Color <span className="opacity-60">(tints the CTA button)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customizeForm.accent_color ?? "#3B6AE8"}
                        onChange={(e) => setCustomizeForm((f) => ({ ...f, accent_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="#3B6AE8"
                        maxLength={7}
                        value={customizeForm.accent_color ?? ""}
                        onChange={(e) => setCustomizeForm((f) => ({ ...f, accent_color: e.target.value || null }))}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 w-32 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={() => setCustomizeId(null)}>Cancel</Button>
                    <Button size="sm" loading={customizeSaving} onClick={() => handleCustomizeSave(lk.id)}>Save</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

        </div>
      )}

      {/* Create link modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Create One-Time Link</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none transition-colors"
              >✕</button>
            </div>
            {createFormJSX}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-2xl px-5 py-3 shadow-2xl shadow-black/30">
          <span className="text-sm font-medium text-[var(--text-primary)]">{selected.size} selected</span>
          <Button size="sm" variant="danger" onClick={handleBulkRevoke}>Revoke Selected</Button>
          <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete Selected</Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >Clear</button>
        </div>
      )}
    </div>
  );
}

// ── Permanent Links Tab ───────────────────────────────────────────────────────
function PermanentLinksTab() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);
  const [items, setItems] = useState<PermanentLinkRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[1]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [showCreateCustomize, setShowCreateCustomize] = useState(false);
  const [createCustomize, setCreateCustomize] = useState<LinkCustomizationPayload>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [customizeId, setCustomizeId] = useState<string | null>(null);
  const [customizeForm, setCustomizeForm] = useState<LinkCustomizationPayload>({});
  const [customizeSaving, setCustomizeSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = async (p: number, s: string, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const res = await api.profiles.listLinks({ page: p, limit: 10, search: s });
      setItems((prev) => append ? [...prev, ...res.items] : res.items);
      setTotal(res.total);
      setHasMore(res.has_more);
      setPage(p);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { if (!append) setLoading(false); else setLoadingMore(false); }
  };

  useEffect(() => {
    // Load saved questions from localStorage (shared with OTL tab)
    try {
      const saved = localStorage.getItem("draftmeet_saved_questions");
      if (saved) {
        const parsed: CustomField[] = JSON.parse(saved);
        if (parsed.length > 0) { setCustomFields(parsed); setShowFields(true); }
      }
    } catch { /* ignore */ }
    // Load saved customization from localStorage (shared with OTL tab)
    try {
      const savedC = localStorage.getItem("draftmeet_saved_customization");
      if (savedC) {
        const parsed: LinkCustomizationPayload = JSON.parse(savedC);
        setCreateCustomize(parsed);
        const hasAny = parsed.description || parsed.cover_image_url || parsed.bg_image_url || parsed.accent_color;
        if (hasAny) setShowCreateCustomize(true);
      }
    } catch { /* ignore */ }
    Promise.all([api.profiles.getMe(), fetchPage(1, "", false), api.domains.get()])
      .then(([p, , domain]) => {
        setProfile(p);
        if (domain?.verified && domain.domain) setVerifiedDomain(domain.domain);
      })
      .catch((e: unknown) => alert(errMsg(e)));
  }, []);

  // Auto-save questions to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("draftmeet_saved_questions", JSON.stringify(customFields)); }
    catch { /* ignore */ }
  }, [customFields]);

  // Auto-save customization to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem("draftmeet_saved_customization", JSON.stringify(createCustomize)); }
    catch { /* ignore */ }
  }, [createCustomize]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setSelected(new Set());
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPage(1, val, false), 300);
  };

  const handleLoadMore = () => fetchPage(page + 1, search, true);

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
        description: createCustomize.description || undefined,
        cover_image_url: createCustomize.cover_image_url || undefined,
        bg_image_url: createCustomize.bg_image_url || undefined,
        accent_color: createCustomize.accent_color || undefined,
      };
      await api.profiles.createLink(payload);
      setSlug("");
      setMeetingTitle("");
      setShowCreateModal(false);
      fetchPage(1, search, false);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCreating(false); }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.profiles.toggleLink(id);
      setItems((l) => l.map((x) => x.id === id ? updated : x));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this permanent link? Visitors will see a 404.")) return;
    try {
      await api.profiles.deleteLink(id);
      setItems((l) => l.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleCustomizeSave = async (id: string) => {
    setCustomizeSaving(true);
    try {
      const updated = await api.profiles.customizeLink(id, customizeForm);
      setItems((l) => l.map((x) => x.id === id ? { ...x, ...updated } : x));
      setCustomizeId(null);
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setCustomizeSaving(false); }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (!confirm(`Delete ${ids.length} link(s)?`)) return;
    try {
      await api.profiles.bulkDeleteLinks(ids);
      fetchPage(1, search, false);
      setSelected(new Set());
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected = items.length > 0 && items.every((x) => selected.has(x.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(items.map((x) => x.id)));

  const copyLink = (slug: string, id: string) => {
    if (!profile) return;
    const base = verifiedDomain ? `https://${verifiedDomain}` : window.location.origin;
    const url = verifiedDomain
      ? `${base}/${slug}`
      : `${base}/u/${profile.username}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const createFormJSX = (
    <div className="flex flex-col gap-4">
      <div>
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
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFields(!showFields)}
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 transition-colors"
            >
              {showFields ? "▾ Hide" : "▸ Add"} Custom Questions
              {customFields.length > 0 && (
                <span className="ml-1 text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                  {customFields.length} saved
                </span>
              )}
            </button>
            {customFields.length > 0 && (
              <button
                onClick={() => { setCustomFields([]); setShowFields(false); }}
                className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          {showFields && (
            <FieldBuilder
              fields={customFields}
              onAdd={() => setCustomFields((f) => [...f, { label: "", type: "text", required: true }])}
              onUpdate={(idx, u) => setCustomFields((f) => f.map((x, i) => i === idx ? { ...x, ...u } : x))}
              onRemove={(idx) => setCustomFields((f) => f.filter((_, i) => i !== idx))}
            />
          )}
        </div>

        {/* Customize Page section */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowCreateCustomize(!showCreateCustomize)}
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-cyan)] font-semibold flex items-center gap-1 transition-colors"
            >
              {showCreateCustomize ? "▾ Hide" : "▸ Set"} Page Customization
              {(createCustomize.description || createCustomize.cover_image_url || createCustomize.bg_image_url || createCustomize.accent_color) && (
                <span className="ml-1 text-xs bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30 px-2 py-0.5 rounded-full">saved</span>
              )}
            </button>
            {(createCustomize.description || createCustomize.cover_image_url || createCustomize.bg_image_url || createCustomize.accent_color) && (
              <button
                onClick={() => { setCreateCustomize({}); setShowCreateCustomize(false); }}
                className="text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              >Clear</button>
            )}
          </div>
          {showCreateCustomize && (
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Description <span className="opacity-60">(shown on booking page)</span></label>
                <textarea rows={2} maxLength={1000} placeholder="e.g. Book a 30-minute intro call…"
                  value={createCustomize.description ?? ""}
                  onChange={(e) => setCreateCustomize((f) => ({ ...f, description: e.target.value || null }))}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Cover Image URL <span className="opacity-60">(HTTPS)</span></label>
                <input type="url" placeholder="https://example.com/cover.jpg"
                  value={createCustomize.cover_image_url ?? ""}
                  onChange={(e) => setCreateCustomize((f) => ({ ...f, cover_image_url: e.target.value || null }))}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
                {createCustomize.cover_image_url && (
                  <img src={createCustomize.cover_image_url} alt="Cover preview"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="mt-1 rounded-lg h-24 object-cover w-full" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Background Image URL <span className="opacity-60">(HTTPS, fills page behind card)</span></label>
                <input type="url" placeholder="https://example.com/bg.jpg"
                  value={createCustomize.bg_image_url ?? ""}
                  onChange={(e) => setCreateCustomize((f) => ({ ...f, bg_image_url: e.target.value || null }))}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                />
                {createCustomize.bg_image_url && (
                  <img src={createCustomize.bg_image_url} alt="Background preview"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="mt-1 rounded-lg h-20 object-cover w-full" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Accent Color <span className="opacity-60">(button color)</span></label>
                <div className="flex items-center gap-3">
                  <input type="color" value={createCustomize.accent_color ?? "#3B6AE8"}
                    onChange={(e) => setCreateCustomize((f) => ({ ...f, accent_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent" />
                  <input type="text" placeholder="#3B6AE8" maxLength={7}
                    value={createCustomize.accent_color ?? ""}
                    onChange={(e) => setCreateCustomize((f) => ({ ...f, accent_color: e.target.value || null }))}
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 w-32 font-mono" />
                </div>
              </div>
            </div>
          )}
        </div>

      <div className="flex justify-end">
        <Button onClick={handleCreate} loading={creating} disabled={!slug}>Create Link</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5" onClick={() => setMenuOpenId(null)}>
      <div className="flex justify-end">
        <Button onClick={(e) => { e.stopPropagation(); setShowCreateModal(true); }}>+ New Permanent Link</Button>
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search by slug or title…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 min-w-[180px] bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
        />
        <span className="text-xs text-[var(--text-secondary)]">{total} total</span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState icon="♾️" title="No permanent links found" subtitle={search ? "Try adjusting your search" : "Create a reusable link that never expires"} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded accent-[var(--accent)] w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-[var(--text-secondary)]">Select all on this page</span>
          </div>

          {items.map((lk) => (
            <Card key={lk.id} className="p-5">
              <div className="flex items-start gap-3 flex-wrap">
                <input
                  type="checkbox"
                  checked={selected.has(lk.id)}
                  onChange={() => toggleSelect(lk.id)}
                  className="rounded accent-[var(--accent)] w-4 h-4 cursor-pointer flex-shrink-0 mt-1"
                />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge status={lk.is_active ? "active" : "expired"}>{lk.is_active ? "Active" : "Paused"}</Badge>
                    <span className="font-mono text-sm text-[var(--text-primary)]">
                      {profile ? `/${profile.username}/${lk.slug}` : `/${lk.slug}`}
                    </span>
                    {lk.custom_fields.length > 0 && (
                      <span className="text-xs bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30 px-2 py-0.5 rounded-full">
                        {lk.custom_fields.length} Q{lk.custom_fields.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {lk.custom_title ? <span className="text-[var(--text-primary)] font-medium">{lk.custom_title} · </span> : null}
                    {lk.event_type} · Permanent
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    ref={(el) => { if (el) menuBtnRefs.current.set(lk.id, el); else menuBtnRefs.current.delete(lk.id); }}
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === lk.id ? null : lk.id); }}
                    className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xl leading-none rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                  >⋮</button>
                  {menuOpenId === lk.id && (
                    <RowMenu
                      anchorRef={{ current: menuBtnRefs.current.get(lk.id) ?? null }}
                      onClose={() => setMenuOpenId(null)}
                      items={[
                        ...(lk.is_active ? [{ label: copied === lk.id ? "✓ Copied!" : "Copy Link", onClick: () => copyLink(lk.slug, lk.id) }] : []),
                        { label: embedId === lk.id ? "Hide Embed" : "Embed Code", onClick: () => setEmbedId(embedId === lk.id ? null : lk.id) },
                        { label: customizeId === lk.id ? "Hide Customize" : "Customize", onClick: () => {
                          if (customizeId === lk.id) { setCustomizeId(null); return; }
                          setCustomizeId(lk.id);
                          setCustomizeForm({ description: lk.description ?? "", cover_image_url: lk.cover_image_url ?? "", bg_image_url: lk.bg_image_url ?? "", accent_color: lk.accent_color ?? "" });
                        }},
                        { label: lk.is_active ? "Pause" : "Resume", onClick: () => handleToggle(lk.id) },
                        { label: "Delete", onClick: () => handleDelete(lk.id), danger: true },
                      ]}
                    />
                  )}
                </div>
              </div>
              {embedId === lk.id && profile && (
                <div className="mt-3 bg-[var(--bg-deep)] rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xs text-[var(--text-secondary)] mb-2 font-semibold">Paste this into any webpage:</p>
                  <pre className="text-xs text-[var(--accent-cyan)] whitespace-pre-wrap break-all leading-relaxed">{`<script src="https://draftmeet.com/embed.js"\n        data-username="${profile.username}"\n        data-slug="${lk.slug}"></script>`}</pre>
                  <button
                    className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] transition-colors"
                    onClick={() => navigator.clipboard.writeText(`<script src="https://draftmeet.com/embed.js"\n        data-username="${profile.username}"\n        data-slug="${lk.slug}"></script>`)}
                  >
                    Copy snippet
                  </button>
                </div>
              )}
              {customizeId === lk.id && (
                <div className="mt-3 bg-[var(--bg-deep)] rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Page Customization</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Description <span className="opacity-60">(optional, shown on booking page)</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      placeholder="e.g. Book a 30-minute intro call to discuss your project…"
                      value={customizeForm.description ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, description: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Cover Image URL <span className="opacity-60">(HTTPS only)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/cover.jpg"
                      value={customizeForm.cover_image_url ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, cover_image_url: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                    />
                    {customizeForm.cover_image_url && (
                      <img
                        src={customizeForm.cover_image_url}
                        alt="Cover preview"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="mt-1 rounded-lg h-24 object-cover w-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Background Image URL <span className="opacity-60">(HTTPS only, fills page behind card)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/bg.jpg"
                      value={customizeForm.bg_image_url ?? ""}
                      onChange={(e) => setCustomizeForm((f) => ({ ...f, bg_image_url: e.target.value || null }))}
                      className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
                    />
                    {customizeForm.bg_image_url && (
                      <img
                        src={customizeForm.bg_image_url}
                        alt="Background preview"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="mt-1 rounded-lg h-20 object-cover w-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Accent Color <span className="opacity-60">(tints the CTA button)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customizeForm.accent_color ?? "#3B6AE8"}
                        onChange={(e) => setCustomizeForm((f) => ({ ...f, accent_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="#3B6AE8"
                        maxLength={7}
                        value={customizeForm.accent_color ?? ""}
                        onChange={(e) => setCustomizeForm((f) => ({ ...f, accent_color: e.target.value || null }))}
                        className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 w-32 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={() => setCustomizeId(null)}>Cancel</Button>
                    <Button size="sm" loading={customizeSaving} onClick={() => handleCustomizeSave(lk.id)}>Save</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create permanent link modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Create Permanent Link</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none transition-colors"
              >✕</button>
            </div>
            {createFormJSX}
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-2xl px-5 py-3 shadow-2xl shadow-black/30">
          <span className="text-sm font-medium text-[var(--text-primary)]">{selected.size} selected</span>
          <Button size="sm" variant="danger" onClick={handleBulkDelete}>Delete Selected</Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >Clear</button>
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
