"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, OTLRow, EVENT_TYPES, CustomField } from "@/lib/api-client";
import { errMsg } from "@/lib/errors";
import { Button, Input, Spinner } from "@/components/ui";

type Step = "loading" | "error" | "pick-date" | "pick-slot" | "form" | "success";

export default function BookingPage() {
  const params = useParams();
  const token = params?.token as string;

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

  // Step 1: validate OTL
  useEffect(() => {
    if (!token) return;
    api.links.validate(token)
      .then((data) => {
        setOtl(data);
        if (data.custom_fields && data.custom_fields.length > 0) {
          setCustomFields(data.custom_fields);
          // Initialize answers
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
      const res = await api.availability.getSlots(
        date,
        otl?.event_type ?? EVENT_TYPES[1],
        otl?.user_id
      );
      setSlots(res.slots);
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
      const booking = await api.bookings.create({
        guest_name: form.name,
        guest_email: form.email,
        scheduled_at: selectedSlot,
        event_type: otl?.event_type ?? EVENT_TYPES[1],
        notes: form.notes || undefined,
        one_time_link_id: token,
        custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
      });
      setMeetLink(booking.meet_link ?? "");
      setStep("success");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
          style={{ background: "linear-gradient(135deg, #0f1117 0%, #12103a 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/logo.png" alt="MeetSync" className="w-8 h-8 rounded-lg shadow-md shadow-indigo-600/20" />
          <span className="text-lg font-bold text-white">MeetSync</span>
        </div>

        <div className="bg-[#1a1d27] border border-[#2e3248] rounded-2xl overflow-hidden">
          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8">
              <Spinner size={36} />
              <p className="text-zinc-400 text-sm">Validating your booking link…</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
              <div className="text-5xl">🔒</div>
              <p className="font-semibold text-white text-lg">Link Unavailable</p>
              <p className="text-zinc-400 text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Pick Date */}
          {(step === "pick-date" || step === "pick-slot") && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">Booking Link</p>
                <h2 className="text-xl font-bold text-white">{otl?.event_type}</h2>
                <p className="text-sm text-zinc-400 mt-1">Pick a date to see available slots</p>
              </div>

              <Input label="Select Date" type="date" min={todayStr} value={selectedDate}
                onChange={(e) => fetchSlots(e.target.value)} />

              {loadingSlots && <div className="flex justify-center py-4"><Spinner /></div>}

              {step === "pick-slot" && !loadingSlots && (
                <>
                  {slots.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-zinc-400 text-sm">😔 No available slots on this day.</p>
                      <p className="text-zinc-500 text-xs mt-1">Try picking another date.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-zinc-300 mb-3">Available Times</p>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const time = new Date(s).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                          const chosen = selectedSlot === s;
                          return (
                            <button key={s} onClick={() => { setSelectedSlot(s); setStep("form"); }}
                              className={`py-2.5 rounded-xl text-sm font-semibold transition-all
                                ${chosen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                  : "bg-white/6 text-zinc-300 hover:bg-indigo-600/20 hover:text-indigo-300"}`}>
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
            <div className="p-6 flex flex-col gap-5">
              <div>
                <button onClick={() => setStep("pick-slot")} className="text-xs text-indigo-400 hover:text-indigo-300 mb-3 flex items-center gap-1">
                  ← Change time
                </button>
                <h2 className="text-xl font-bold text-white">{otl?.event_type}</h2>
                <p className="text-sm text-indigo-300 mt-1">
                  📅 {new Date(selectedSlot).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
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
                  <label className="text-sm font-medium text-zinc-300">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {field.type === "text" && (
                    <input
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[#12151f] border rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[#2e3248]"}`}
                    />
                  )}

                  {field.type === "textarea" && (
                    <textarea
                      rows={3}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[#12151f] border rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[#2e3248]"}`}
                    />
                  )}

                  {field.type === "dropdown" && (
                    <select
                      value={customAnswers[field.label] || ""}
                      onChange={(e) => setCustomAnswers((a) => ({ ...a, [field.label]: e.target.value }))}
                      className={`bg-[#12151f] border rounded-xl px-4 py-2.5 text-sm text-white
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all
                        ${formErrors[field.label] ? "border-red-500/50" : "border-[#2e3248]"}`}
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
                <label className="text-sm font-medium text-zinc-300">Notes (optional)</label>
                <textarea
                  rows={3} placeholder="Anything you'd like to discuss…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="bg-[#12151f] border border-[#2e3248] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/60 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <label className="flex items-start gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 bg-[#12151f] border-[#2e3248] rounded text-indigo-500 focus:ring-indigo-500/50" />
                  <span>I agree to the <a href="/terms" target="_blank" className="text-indigo-400 hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-indigo-400 hover:underline">Privacy Policy</a>, and I consent to the processing of my booking data.</span>
                </label>
                {formErrors["consent"] && <p className="text-xs text-red-400">{formErrors["consent"]}</p>}
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <Button onClick={handleBook} loading={submitting}
                disabled={!form.name || !form.email || !consent}>
                Confirm Booking
              </Button>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-5 py-14 px-8 text-center">
              <div className="text-6xl">🎉</div>
              <div>
                <p className="font-bold text-white text-xl">Booking Confirmed!</p>
                <p className="text-zinc-400 text-sm mt-2">{form.name}, check your email for a Google Calendar invite.</p>
              </div>
              {meetLink && (
                <a href={meetLink} target="_blank" rel="noopener noreferrer"
                   className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm text-center transition-all shadow-lg shadow-indigo-600/30">
                  🎥 Join Google Meet
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
