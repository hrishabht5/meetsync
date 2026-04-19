"use client";
import React, { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { OTLRow, EVENT_TYPES, CustomField } from "@/lib/api-client";
import { useTheme } from "@/components/themeProvider";
import { errMsg } from "@/lib/errors";
import { Button, Input, Spinner } from "@/components/ui";
import { BookingCalendar } from "@/components/BookingCalendar";
import { publicGet, publicPost } from "@/lib/public-api";

type Step = "loading" | "error" | "pick-date" | "pick-slot" | "form" | "success";

function CustomDomainOTLBookingInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const domain = params?.domain as string;
  const token = params?.token as string;
  const isEmbed = searchParams.get("embed") === "1";

  const [step, setStep] = useState<Step>("loading");
  const [otl, setOtl] = useState<OTLRow | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [meetLink, setMeetLink] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [managementToken, setManagementToken] = useState("");
  const [hostTz, setHostTz] = useState("");
  const guestTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const { theme } = useTheme();

  // Step 1: validate OTL
  useEffect(() => {
    if (!token || !domain) return;
    publicGet<OTLRow>(`links/${token}/`)
      .then((data) => {
        setOtl(data);
        if (data.custom_fields && data.custom_fields.length > 0) {
          setCustomFields(data.custom_fields);
          const init: Record<string, string> = {};
          data.custom_fields.forEach((f: CustomField) => { init[f.label] = ""; });
          setCustomAnswers(init);
        }
        setStep("pick-date");
      })
      .catch((e: Error) => { setErrorMsg(e.message); setStep("error"); });
  }, [token]);

  // Step 2: fetch slots
  const fetchSlots = async (date: string) => {
    setSelectedDate(date);
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot("");
    try {
      const qs = new URLSearchParams({
        date,
        event_type: otl?.event_type ?? EVENT_TYPES[1],
        one_time_link_id: token,
        timezone: guestTz,
      }).toString();
      const res = await publicGet<{ slots: string[]; timezone: string }>(
        "availability/slots",
        qs,
      );
      setSlots(res.slots);
      setHostTz(res.timezone);
      setStep("pick-slot");
    } catch (e: unknown) {
      setErrorMsg(errMsg(e));
    } finally {
      setLoadingSlots(false);
    }
  };

  // Validate custom fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors["name"] = "Name is required";
    if (!form.email.trim()) errors["email"] = "Email is required";

    for (const field of customFields) {
      if (field.required && !customAnswers[field.label]?.trim()) {
        errors[field.label] = `${field.label} is required`;
      }
    }
    if (!consent) {
      errors["consent"] = "You must agree to the Terms of Service and Privacy Policy.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3: submit booking
  const handleBook = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const booking = await publicPost<{ id: string; meet_link?: string; management_token?: string }>(
        "bookings/",
        {
          guest_name: form.name,
          guest_email: form.email,
          scheduled_at: selectedSlot,
          event_type: otl?.event_type ?? EVENT_TYPES[1],
          notes: form.notes || undefined,
          one_time_link_id: token,
          custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
        }
      );
      setMeetLink(booking.meet_link ?? "");
      setManagementToken(booking.management_token ?? "");
      setStep("success");
      if (isEmbed) {
        const parentOrigin = document.referrer ? new URL(document.referrer).origin : window.location.origin;
        window.parent.postMessage(
          { type: "draftmeet:booking_confirmed", bookingId: booking.id, meetLink: booking.meet_link ?? "" },
          parentOrigin
        );
      }
    } catch (e: unknown) {
      setErrorMsg(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  };

  const mainStyle: React.CSSProperties = {
    ...(otl?.accent_color ? ({ "--accent": otl.accent_color } as React.CSSProperties) : {}),
    ...(otl?.bg_image_url ? { backgroundImage: `url(${otl.bg_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
  };

  return (
    <main
      style={mainStyle}
      className={isEmbed ? "w-full p-3" : `min-h-screen flex items-center justify-center px-4 py-12${otl?.bg_image_url ? "" : " bg-page-gradient"}`}
    >
      {!isEmbed && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px] opacity-20 pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(59,106,232,0.6) 0%, rgba(56,191,255,0.2) 60%, transparent 100%)" }} />
      )}

      <div className={isEmbed ? "w-full" : "relative z-10 w-full max-w-md"}>
        {!isEmbed && !otl?.remove_branding && (
          <div className="flex items-center gap-2 mb-8 justify-center">
            <img src={theme === "dark" ? "/logo-dark.png" : "/logo-light.png"} alt="DraftMeet" className="w-8 h-8 rounded-lg glow-brand-sm" />
            <span className="text-lg font-bold text-[var(--text-primary)]">DraftMeet</span>
          </div>
        )}

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden glow-brand">
          {/* Cover image */}
          {otl?.cover_image_url && (
            <div className="w-full h-36 overflow-hidden">
              <img
                src={otl.cover_image_url}
                alt="Booking cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8">
              <Spinner size={36} />
              <p className="text-[var(--text-secondary)] text-sm">Validating your booking link…</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
              <div className="text-5xl">🔒</div>
              <p className="font-semibold text-[var(--text-primary)] text-lg">Link Unavailable</p>
              <p className="text-[var(--text-secondary)] text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Pick Date */}
          {(step === "pick-date" || step === "pick-slot") && (
            <div className="p-6 flex flex-col gap-5 animate-fade-up">
              <div>
                <p className="text-xs text-[var(--accent-cyan)] font-semibold uppercase tracking-wider mb-1">Booking Link</p>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{otl?.custom_title || otl?.event_type}</h2>
                {otl?.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{otl.description}</p>
                )}
                <p className="text-sm text-[var(--text-secondary)] mt-1">Pick a date to see available slots</p>
              </div>

              <BookingCalendar
                selectedDate={selectedDate}
                onSelectDate={fetchSlots}
                loading={loadingSlots}
              />

              {loadingSlots && <div className="flex justify-center py-2"><Spinner /></div>}

              {step === "pick-slot" && !loadingSlots && (
                <>
                  {slots.length === 0 ? (
                    <div className="text-center py-4 bg-[var(--bg-card-hover)] rounded-xl border border-[var(--border)]">
                      <p className="text-[var(--text-secondary)] text-sm">No available slots on this day.</p>
                      <p className="text-[var(--text-secondary)]/60 text-xs mt-1">Try picking another date.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Available Times</p>
                        {hostTz && (
                          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                            🌍 <span className="font-medium text-[var(--text-primary)]">{guestTz.replace(/_/g, " ")}</span>
                            {hostTz !== guestTz && <span className="opacity-50">· host: {hostTz.replace(/_/g, " ")}</span>}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const time = new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: guestTz });
                          const chosen = selectedSlot === s;
                          return (
                            <button key={s} onClick={() => { setSelectedSlot(s); setStep("form"); }}
                              style={chosen && otl?.accent_color ? { background: otl.accent_color } : undefined}
                              className={`py-2.5 rounded-xl text-sm font-semibold transition-all
                                ${chosen
                                  ? `${otl?.accent_color ? "" : "bg-brand-gradient"} text-white shadow-lg glow-brand-sm`
                                  : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--accent)]/15 hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-accent)]"
                                }`}>
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Booking Form */}
          {step === "form" && (
            <div className="p-6 flex flex-col gap-5 animate-fade-up">
              <div>
                <button onClick={() => setStep("pick-slot")} className="text-xs text-[var(--accent)] hover:text-[var(--accent-cyan)] mb-3 flex items-center gap-1 transition-colors">
                  ← Change time
                </button>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{otl?.custom_title || otl?.event_type}</h2>
                {otl?.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{otl.description}</p>
                )}
                <p className="text-sm text-[var(--accent-cyan)] mt-1">
                  📅 {new Date(selectedSlot).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: guestTz })}
                </p>
              </div>

              <Input label="Your Name" placeholder="Jane Smith" value={form.name}
                error={formErrors["name"]}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Your Email" type="email" placeholder="jane@example.com" value={form.email}
                error={formErrors["email"]}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />

              {/* Dynamic Custom Fields */}
              {customFields.map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {field.type === "text" && (
                    <input
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[var(--border)]"}`}
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      rows={3}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[var(--border)]"}`}
                    />
                  )}

                  {field.type === "dropdown" && (
                    <select
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[var(--bg-input)] border rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)]
                        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[var(--border)]"}`}
                    >
                      <option value="">Select…</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {formErrors[field.label] && <p className="text-xs text-red-400">{formErrors[field.label]}</p>}
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--text-primary)]">Notes (optional)</label>
                <textarea
                  rows={3} placeholder="Anything you'd like to discuss…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 resize-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 bg-[var(--bg-input)] border-[var(--border)] rounded accent-[var(--accent)] focus:ring-[var(--accent)]/40" />
                  <span>I agree to the <a href="/terms" target="_blank" className="text-[var(--accent)] hover:text-[var(--accent-cyan)] hover:underline transition-colors">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-[var(--accent)] hover:text-[var(--accent-cyan)] hover:underline transition-colors">Privacy Policy</a>, and I consent to the processing of my booking data.</span>
                </label>
                {formErrors["consent"] && <p className="text-xs text-red-400">{formErrors["consent"]}</p>}
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <Button onClick={handleBook} loading={submitting}
                disabled={!form.name || !form.email || !consent}
                style={otl?.accent_color ? { background: otl.accent_color } : undefined}>
                Confirm Booking
              </Button>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-5 py-14 px-8 text-center animate-scale-in">
              <div className="text-6xl">🎉</div>
              <div>
                <p className="font-bold text-[var(--text-primary)] text-xl">Booking Confirmed!</p>
                <p className="text-[var(--text-secondary)] text-sm mt-2">{form.name}, check your email for a Google Calendar invite.</p>
              </div>
              {meetLink && (
                <a href={meetLink} target="_blank" rel="noopener noreferrer"
                   className="w-full py-3 rounded-2xl bg-brand-gradient text-white font-semibold text-sm text-center transition-all shadow-lg shadow-[rgba(59,106,232,0.35)] hover:opacity-90 hover:-translate-y-0.5">
                  🎥 Join Google Meet
                </a>
              )}
              {managementToken && (
                <a href={`/manage/${managementToken}`}
                   className="w-full py-3 rounded-2xl bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm text-center transition-all ring-1 ring-[var(--border)] hover:ring-[var(--border-accent)] hover:-translate-y-0.5">
                  🔧 Manage Booking (Cancel / Reschedule)
                </a>
              )}
              {managementToken && (
                <p className="text-xs text-[var(--text-secondary)] text-center">
                  Save this link to cancel or reschedule later
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CustomDomainOTLBookingPage() {
  return (
    <Suspense fallback={null}>
      <CustomDomainOTLBookingInner />
    </Suspense>
  );
}
