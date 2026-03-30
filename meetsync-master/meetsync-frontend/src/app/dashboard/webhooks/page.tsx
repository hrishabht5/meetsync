"use client";
import { useEffect, useState } from "react";
import { api, WebhookRow, WebhookLog, APIKeyRow } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from "@/components/ui";

const VALID_EVENTS = ["booking.created", "booking.confirmed", "booking.cancelled", "link.used", "meet.link.created"];

export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<"webhooks" | "apikeys">("webhooks");
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["booking.created"]);
  const [registering, setRegistering] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const [newKeyName, setNewKeyName] = useState("");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.webhooks.list(), api.webhooks.getLogs(), api.apiKeys.list()])
      .then(([wh, lg, keys]) => {
        setWebhooks(wh);
        setLogs(lg);
        setApiKeys(keys);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!url) return;
    setRegistering(true);
    try {
      const wh = await api.webhooks.register({ url, secret: secret || undefined, events: selectedEvents });
      setWebhooks((w) => [wh, ...w]);
      setUrl(""); setSecret("");
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setRegistering(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await api.webhooks.delete(id);
      setWebhooks((w) => w.filter((x) => x.id !== id));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.webhooks.toggle(id);
      setWebhooks((w) => w.map((x) => x.id === id ? { ...x, is_active: res.is_active } : x));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  const handleTest = async () => {
    setTesting(true);
    try { await api.webhooks.test(); alert("Test event sent to all active endpoints!"); }
    catch (e: unknown) { alert(errMsg(e)); }
    finally { setTesting(false); }
  };

  const toggleEvent = (ev: string) =>
    setSelectedEvents((s) => s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]);

  const handleGenerateKey = async () => {
    if (!newKeyName) return;
    setGeneratingKey(true);
    setCreatedKey(null);
    try {
      const resp = await api.apiKeys.create({ name: newKeyName });
      setApiKeys((prev) => [resp, ...prev]);
      setCreatedKey(resp.key || null);
      setNewKeyName("");
    } catch (e: unknown) { alert(errMsg(e)); }
    finally { setGeneratingKey(false); }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Permanently revoke this API Key? Any integrations using it will immediately fail.")) return;
    try {
      await api.apiKeys.delete(id);
      setApiKeys((keys) => keys.filter((k) => k.id !== id));
    } catch (e: unknown) { alert(errMsg(e)); }
  };

  return (
    <>
      <SectionHeader
        title="Developer Settings"
        subtitle="Manage Webhooks and API Keys for programmatic access"
        action={
          <div className="flex bg-[var(--bg-card-hover)] rounded-lg p-1 ring-1 ring-[var(--border)]">
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === "webhooks"
                  ? "bg-brand-gradient text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab("apikeys")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === "apikeys"
                  ? "bg-brand-gradient text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              API Keys
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : activeTab === "webhooks" ? (
        /* ================= WEBHOOKS TAB ================= */
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowLogs((x) => !x)}>
              {showLogs ? "Show Endpoints" : "View Logs"}
            </Button>
            <Button variant="secondary" size="sm" loading={testing} onClick={handleTest}>
              Send Test
            </Button>
          </div>

          {!showLogs ? (
            <>
              {/* Register Webhook */}
              <Card className="p-5">
                <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Register Endpoint</p>
                <div className="flex flex-col gap-3">
                  <Input label="Endpoint URL" placeholder="https://your-server.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
                  <Input label="Secret (optional)" placeholder="Used for HMAC signature" value={secret} onChange={(e) => setSecret(e.target.value)} />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Subscribe to Events</p>
                    <div className="flex flex-wrap gap-2">
                      {VALID_EVENTS.map((ev) => (
                        <button key={ev} onClick={() => toggleEvent(ev)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                            ${selectedEvents.includes(ev)
                              ? "bg-brand-gradient text-white"
                              : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] ring-1 ring-[var(--border)]"
                            }`}>
                          {ev}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleRegister} loading={registering} disabled={!url}>Register</Button>
                  </div>
                </div>
              </Card>

              {/* List Webhooks */}
              {webhooks.length === 0 ? (
                <EmptyState icon="🔔" title="No webhooks registered" subtitle="Register an endpoint to receive real-time events" />
              ) : (
                <div className="flex flex-col gap-3">
                  {webhooks.map((wh) => (
                    <Card key={wh.id} className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge status={wh.is_active ? "active" : "expired"}>{wh.is_active ? "Active" : "Paused"}</Badge>
                            <span className="text-sm text-[var(--text-primary)] font-mono truncate max-w-xs">{wh.url}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {wh.events.map((ev) => (
                              <span key={ev} className="text-xs bg-[var(--bg-card-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md ring-1 ring-[var(--border)]">{ev}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => handleToggle(wh.id)}>
                            {wh.is_active ? "Pause" : "Resume"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(wh.id)}>Delete</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Logs View */
            <div className="flex flex-col gap-3">
              {logs.length === 0 ? (
                <EmptyState icon="📋" title="No delivery logs yet" subtitle="Logs will appear here after your first webhook fires" />
              ) : logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge status={log.success ? "success" : "error"}>{log.success ? "Delivered" : "Failed"}</Badge>
                      <span className="text-sm font-mono text-[var(--text-primary)]">{log.event}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {log.status_code && <span>HTTP {log.status_code}</span>}
                      <span>{log.attempts} attempt{log.attempts > 1 ? "s" : ""}</span>
                      {log.error && <span className="text-red-400 truncate max-w-xs">{log.error}</span>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ================= API KEYS TAB ================= */
        <div className="space-y-6">
          <Card className="p-5">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-4">Generate New API Key</p>
            <div className="flex flex-col gap-4">
              <Input
                label="Key Name"
                placeholder="e.g. Zapier Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleGenerateKey} loading={generatingKey} disabled={!newKeyName}>
                  Generate Key
                </Button>
              </div>

              {createdKey && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400 font-medium mb-2">
                    Key generated successfully! Copy it now, you will not be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 block p-2 bg-black/40 text-emerald-300 rounded font-mono text-sm break-all">
                      {createdKey}
                    </code>
                    <Button
                      variant="secondary"
                      onClick={() => navigator.clipboard.writeText(createdKey)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {apiKeys.length === 0 ? (
            <EmptyState icon="🔑" title="No API keys" subtitle="Generate a key to integrate with the V1 Public API" />
          ) : (
            <div className="flex flex-col gap-3">
              {apiKeys.map((key) => (
                <Card key={key.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{key.name}</span>
                        <span className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-card-hover)] px-2 py-0.5 rounded ring-1 ring-[var(--border)]">
                          {key.prefix}...
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Created: {new Date(key.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleRevokeKey(key.id)}>Revoke</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
