"use client";
import { useEffect, useState } from "react";
import { api, WebhookRow, WebhookLog } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from "@/components/ui";

const VALID_EVENTS = ["booking.created", "booking.confirmed", "booking.cancelled", "link.used", "meet.link.created"];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["booking.created"]);
  const [registering, setRegistering] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    Promise.all([api.webhooks.list(), api.webhooks.getLogs()])
      .then(([wh, lg]) => { setWebhooks(wh); setLogs(lg); })
      .finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!url) return;
    setRegistering(true);
    try {
      const wh = await api.webhooks.register({ url, secret: secret || undefined, events: selectedEvents });
      setWebhooks((w) => [wh, ...w]);
      setUrl(""); setSecret("");
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setRegistering(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await api.webhooks.delete(id);
      setWebhooks((w) => w.filter((x) => x.id !== id));
    } catch (e: unknown) { alert((e as Error).message); }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await api.webhooks.toggle(id);
      setWebhooks((w) => w.map((x) => x.id === id ? { ...x, is_active: res.is_active } : x));
    } catch (e: unknown) { alert((e as Error).message); }
  };

  const handleTest = async () => {
    setTesting(true);
    try { await api.webhooks.test(); alert("Test event sent to all active endpoints!"); }
    catch (e: unknown) { alert((e as Error).message); }
    finally { setTesting(false); }
  };

  const toggleEvent = (ev: string) =>
    setSelectedEvents((s) => s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]);

  return (
    <>
      <SectionHeader
        title="Webhooks"
        subtitle="Receive events when bookings are created or cancelled"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowLogs((x) => !x)}>
              {showLogs ? "Show Endpoints" : "View Logs"}
            </Button>
            <Button variant="secondary" size="sm" loading={testing} onClick={handleTest}>
              Send Test
            </Button>
          </div>
        }
      />

      {!showLogs ? (
        <>
          {/* Register */}
          <Card className="p-5 mb-6">
            <p className="text-sm font-semibold text-zinc-300 mb-4">Register Endpoint</p>
            <div className="flex flex-col gap-3">
              <Input label="Endpoint URL" placeholder="https://your-server.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
              <Input label="Secret (optional)" placeholder="Used for HMAC signature" value={secret} onChange={(e) => setSecret(e.target.value)} />
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-2">Subscribe to Events</p>
                <div className="flex flex-wrap gap-2">
                  {VALID_EVENTS.map((ev) => (
                    <button key={ev} onClick={() => toggleEvent(ev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                        ${selectedEvents.includes(ev) ? "bg-indigo-600 text-white" : "bg-white/6 text-zinc-400 hover:text-white"}`}>
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

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : webhooks.length === 0 ? (
            <EmptyState icon="🔔" title="No webhooks registered" subtitle="Register an endpoint to receive real-time events" />
          ) : (
            <div className="flex flex-col gap-3">
              {webhooks.map((wh) => (
                <Card key={wh.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge status={wh.is_active ? "active" : "expired"}>{wh.is_active ? "Active" : "Paused"}</Badge>
                        <span className="text-sm text-zinc-300 font-mono truncate max-w-xs">{wh.url}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {wh.events.map((ev) => (
                          <span key={ev} className="text-xs bg-white/6 text-zinc-400 px-2 py-0.5 rounded-md">{ev}</span>
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
                  <span className="text-sm font-mono text-zinc-300">{log.event}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  {log.status_code && <span>HTTP {log.status_code}</span>}
                  <span>{log.attempts} attempt{log.attempts > 1 ? "s" : ""}</span>
                  {log.error && <span className="text-red-400 truncate max-w-xs">{log.error}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
