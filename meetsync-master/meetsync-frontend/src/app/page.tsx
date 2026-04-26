import Link from "next/link";
import Image from "next/image";
import {
  Link2, RefreshCw, CalendarCheck, Clock4,
  BarChart3, Webhook, KeyRound, MessageSquare,
  Zap, Shield, Sparkles, ChevronDown,
  FileText, Timer, Bookmark, CalendarDays,
  Hourglass, Hash, UserCheck, MapPin,
  Palette, Layers, Globe, Star,
  Mail, Bell, TrendingUp, Download, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/themeToggle";
import { WaitlistForm } from "@/components/WaitlistForm";

const IS_LIVE = (process.env.NEXT_PUBLIC_LAUNCH_MODE ?? process.env.LAUNCH_MODE) === "live";

export const metadata = {
  title: "DraftMeet — Free Calendly Alternative with Automatic Google Meet",
  description:
    "Stop the scheduling back-and-forth. Share a link, let clients self-schedule, get a Google Meet created automatically. 17+ features, 100% free. No credit card needed.",
  keywords: [
    "free Calendly alternative",
    "scheduling tool",
    "google meet scheduler",
    "booking link generator",
    "one-time booking links",
    "free scheduling app",
  ],
  alternates: { canonical: "https://www.draftmeet.com" },
  openGraph: {
    title: "DraftMeet — Free Calendly Alternative",
    description:
      "One-time booking links, permanent scheduling pages, automatic Google Meet — all free. Join 500+ on the waitlist.",
    url: "https://www.draftmeet.com",
    type: "website",
    siteName: "DraftMeet",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DraftMeet — Free Calendly Alternative with Automatic Google Meet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@draftmeet",
    title: "DraftMeet — Free Calendly Alternative",
    description:
      "One-time booking links, permanent scheduling pages, automatic Google Meet — all free. Join 500+ on the waitlist.",
    images: ["/og-image.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I create a one-time booking link?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In DraftMeet, open any event type and generate a one-time link. It expires automatically after the first booking is completed — perfect for sending to a single client without exposing your permanent booking page.",
      },
    },
    {
      "@type": "Question",
      name: "Does DraftMeet automatically create Google Meet links?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. When a guest books a meeting, DraftMeet automatically creates a Google Meet event and sends the video conference link to both parties in the confirmation email. No manual step required.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best free Calendly alternative?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "DraftMeet offers one-time booking links, permanent booking pages, automatic Google Meet creation, and booking analytics on its free plan — features Calendly reserves for paid tiers.",
      },
    },
    {
      "@type": "Question",
      name: "Can I connect DraftMeet to Google Calendar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. DraftMeet syncs with Google Calendar to read your real-time availability, prevent double-bookings, and automatically write new booking events to your calendar with a Google Meet link attached.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between a one-time booking link and a permanent booking page?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A one-time booking link expires after a single use — ideal for cold outreach or one-off consultations. A permanent booking page lives at a fixed URL and can be shared publicly or embedded on your website indefinitely. DraftMeet supports both.",
      },
    },
  ],
};

interface FeatureItem {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

interface FeatureCategory {
  label: string;
  accent: string;
  accentBg: string;
  dividerColor: string;
  features: FeatureItem[];
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    label: "Core Scheduling",
    accent: "#6366f1",
    accentBg: "rgba(99,102,241,0.12)",
    dividerColor: "rgba(99,102,241,0.25)",
    features: [
      { Icon: Link2,    title: "One-Time Booking Links",  desc: "Each link expires after one booking. Zero double-bookings." },
      { Icon: FileText, title: "Permanent Booking Pages", desc: "Reusable page at your custom slug. Share everywhere, forever." },
      { Icon: Timer,    title: "Multiple Event Types",    desc: "15, 30, 60 min meetings with custom durations per link." },
    ],
  },
  {
    label: "Automatic Google Meet",
    accent: "#38bfff",
    accentBg: "rgba(56,191,255,0.10)",
    dividerColor: "rgba(56,191,255,0.22)",
    features: [
      { Icon: CalendarCheck, title: "Google Calendar Sync",       desc: "Real-time availability sync. Auto-creates Google Meet events." },
      { Icon: Shield,        title: "Double-Booking Prevention",  desc: "Checks DraftMeet + Google Calendar. No conflicts, ever." },
      { Icon: Bookmark,      title: "Preferred Calendar",         desc: "Choose which Google Calendar receives your events." },
    ],
  },
  {
    label: "Availability Controls",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.10)",
    dividerColor: "rgba(167,139,250,0.22)",
    features: [
      { Icon: Clock4,       title: "Working Hours & Buffers",  desc: "Set days, time shifts, and gaps between meetings." },
      { Icon: CalendarDays, title: "Date Overrides",           desc: "Block vacation days or set custom hours for specific dates." },
      { Icon: Hourglass,    title: "Min Notice & Max Advance", desc: "Require lead time. Limit how far ahead guests can book." },
      { Icon: Hash,         title: "Daily Booking Limits",     desc: "Cap meetings per day. Prevent burnout." },
    ],
  },
  {
    label: "Guest Experience",
    accent: "#22c55e",
    accentBg: "rgba(34,197,94,0.10)",
    dividerColor: "rgba(34,197,94,0.22)",
    features: [
      { Icon: UserCheck,     title: "No Account Required",          desc: "Guests pick a time and book. No signup needed." },
      { Icon: MapPin,        title: "Timezone Auto-Detection",      desc: "Slots show in the guest's local time automatically." },
      { Icon: RefreshCw,     title: "Self-Serve Cancel/Reschedule", desc: "Guests get a magic link to manage their booking." },
      { Icon: MessageSquare, title: "Custom Questions",             desc: "Collect info before the meeting with custom fields." },
    ],
  },
  {
    label: "Your Brand",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.10)",
    dividerColor: "rgba(245,158,11,0.22)",
    features: [
      { Icon: Palette, title: "Public Profile Pages",  desc: "Bio, avatar, cover image, accent color — fully yours." },
      { Icon: Layers,  title: "Custom Link Branding",  desc: "Per-link titles, descriptions, cover images, and colors." },
      { Icon: Globe,   title: "Custom Domains",        desc: "Connect cal.yourbrand.com for a fully branded experience." },
      { Icon: Star,    title: "White-Label",           desc: "Remove DraftMeet branding entirely (premium)." },
    ],
  },
  {
    label: "Email Notifications",
    accent: "#6366f1",
    accentBg: "rgba(99,102,241,0.10)",
    dividerColor: "rgba(99,102,241,0.22)",
    features: [
      { Icon: Mail, title: "Instant Confirmations",     desc: "Both host and guest get booking details + Meet link." },
      { Icon: Bell, title: "Cancel/Reschedule Alerts",  desc: "Automatic emails when anything changes." },
    ],
  },
  {
    label: "Analytics",
    accent: "#38bfff",
    accentBg: "rgba(56,191,255,0.10)",
    dividerColor: "rgba(56,191,255,0.22)",
    features: [
      { Icon: BarChart3,  title: "Booking Dashboard", desc: "Volume, cancellation rates, and trend charts over time." },
      { Icon: TrendingUp, title: "Outcome Tracking",  desc: "Mark meetings completed or no-show. Track your rates." },
      { Icon: Download,   title: "CSV Export",        desc: "Download all booking data as a spreadsheet." },
    ],
  },
  {
    label: "Developer Tools",
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.10)",
    dividerColor: "rgba(167,139,250,0.22)",
    features: [
      { Icon: Webhook,  title: "Webhooks",               desc: "Real-time POST on 6 event types. Connect Zapier, Make, n8n." },
      { Icon: Lock,     title: "HMAC-SHA256 Signatures", desc: "Tamper-proof webhook payloads. Verify every event." },
      { Icon: KeyRound, title: "REST API",               desc: "Full API with key auth. Build DraftMeet into your products." },
    ],
  },
];

const STEPS = [
  {
    Icon: Link2,
    n: "01",
    title: "Create a booking link",
    desc: "Generate a one-time or permanent scheduling link from your dashboard in seconds.",
  },
  {
    Icon: CalendarCheck,
    n: "02",
    title: "Guest self-schedules",
    desc: "They pick from your real-time availability. No account or download needed.",
  },
  {
    Icon: Zap,
    n: "03",
    title: "Google Meet created",
    desc: "Calendar event + Meet link sent to both inboxes automatically. You're ready to go.",
  },
];

const COMPARISON_ROWS: Array<{ feature: string; dm: string; cal: string; calBad: boolean }> = [
  { feature: "One-time links",            dm: "Free", cal: "Paid",    calBad: true },
  { feature: "Google Meet auto-creation", dm: "Free", cal: "Paid",    calBad: true },
  { feature: "Booking analytics",         dm: "Free", cal: "Paid",    calBad: true },
  { feature: "Custom domains",            dm: "Free", cal: "$$$",     calBad: true },
  { feature: "Webhooks",                  dm: "Free", cal: "Paid",    calBad: true },
  { feature: "Guest cancel/reschedule",   dm: "Free", cal: "Limited", calBad: true },
  { feature: "Custom questions",          dm: "Free", cal: "Paid",    calBad: true },
  { feature: "Timezone detection",        dm: "Free", cal: "Free",    calBad: false },
];

const FAQS = [
  {
    q: "How do I create a one-time booking link?",
    a: "In DraftMeet, open any event type and generate a one-time link. It expires after the first booking — perfect for sending to a single client without exposing your permanent booking page.",
  },
  {
    q: "Does DraftMeet automatically create Google Meet links?",
    a: "Yes. When a guest books, DraftMeet auto-creates a Google Meet event and sends the conference link to both parties. No manual step required — the meeting is ready the moment it's booked.",
  },
  {
    q: "What is the best free Calendly alternative?",
    a: "DraftMeet gives you one-time booking links, permanent booking pages, automatic Google Meet creation, and booking analytics on its free plan — features Calendly locks behind paid tiers.",
  },
  {
    q: "What's the difference between a one-time link and a permanent booking page?",
    a: "A one-time link expires after a single use — ideal for cold outreach or one-off consultations. A permanent booking page lives at a fixed URL you can share anywhere, indefinitely. DraftMeet supports both.",
  },
  {
    q: "Can I connect DraftMeet to Google Calendar?",
    a: "Yes. DraftMeet syncs with Google Calendar to read your real-time availability, prevent double-bookings, and write new bookings directly to your calendar — each with a Google Meet link attached.",
  },
];

const scrollRevealScript = `
(function(){
  if(typeof IntersectionObserver==='undefined')return;
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      var delay=parseInt(e.target.dataset.delay||'0',10);
      if(delay){setTimeout(function(){e.target.classList.add('is-visible');},delay);}
      else{e.target.classList.add('is-visible');}
      obs.unobserve(e.target);
    });
  },{threshold:0.08,rootMargin:'0px 0px -24px 0px'});
  function init(){document.querySelectorAll('.scroll-reveal').forEach(function(el){obs.observe(el);});}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
`;

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="min-h-screen flex flex-col bg-page-gradient overflow-x-hidden">

        {/* ── Nav ── */}
        <nav className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-light.png" alt="DraftMeet logo" width={32} height={32} className="logo-light rounded-lg" priority />
            <Image src="/logo-dark.png"  alt="DraftMeet logo" width={32} height={32} className="logo-dark  rounded-lg" />
            <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">DraftMeet</span>
          </div>
          <ThemeToggle compact />
        </nav>

        {/* ── Hero ── */}
        <section className="relative flex flex-col items-start px-6 lg:px-20 py-20 lg:py-28 gap-8 min-h-[90vh] justify-center overflow-hidden">
          {/* Animated orbs */}
          <div
            className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full blur-[160px] pointer-events-none orb-pulse"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.50) 0%, rgba(56,191,255,0.20) 45%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-[10%] right-[10%] w-[420px] h-[420px] rounded-full blur-[140px] pointer-events-none orb-pulse"
            style={{ background: "radial-gradient(circle, rgba(56,191,255,0.30), transparent 70%)", animationDelay: "2s" }}
          />
          <div
            className="absolute top-[30%] left-[5%] w-[260px] h-[260px] rounded-full blur-[120px] pointer-events-none orb-pulse"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)", animationDelay: "1s" }}
          />

          <div className="relative z-10 flex flex-col items-start gap-7 max-w-2xl">
            <span className="animate-scale-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-shimmer text-white text-xs font-semibold tracking-wide shadow-lg">
              <Sparkles size={13} />
              {IS_LIVE ? "Free to start — no credit card" : "Coming Soon — Join the waitlist"}
            </span>

            <h1 className="animate-fade-up text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.06] tracking-tight">
              Smart scheduling links&nbsp;—<br />
              <span className="text-gradient-brand">without the chaos</span>
            </h1>

            <p className="animate-fade-up delay-200 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Share a booking link, let clients self-schedule from your real-time availability, and get a Google Meet event created automatically. The{" "}
              <strong className="text-[var(--text-primary)] font-semibold">free Calendly alternative</strong>{" "}
              built for founders, freelancers, and remote teams.
            </p>

            <div className="animate-fade-up delay-400 w-full max-w-sm">
              {IS_LIVE ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 transition-all duration-150"
                  >
                    <Zap size={15} />
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--accent)] transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <WaitlistForm />
                  <p className="text-xs text-[var(--text-secondary)] mt-3">
                    Be the first to know when we launch. No spam, ever.
                  </p>
                </>
              )}
            </div>

            <p className="animate-fade-up delay-500 text-xs text-[var(--text-secondary)] tracking-wide">
              <span className="font-semibold text-[var(--accent)]">17+ features</span>
              {" · "}100% free{" · "}No credit card
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float opacity-40">
            <div className="w-5 h-8 rounded-full border-2 border-[var(--border)] flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-[var(--accent)] animate-fade-in" />
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="px-6 py-24 max-w-6xl mx-auto w-full">
          <div className="text-center mb-16 scroll-reveal">
            <p className="text-xs font-semibold tracking-widest text-[var(--accent-warm)] uppercase mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Everything you need.{" "}
              <span className="text-gradient-brand">Nothing you don't.</span>
            </h2>
            <p className="text-[var(--text-secondary)] mt-3 text-base max-w-lg mx-auto">
              27 features across scheduling, Google Meet, analytics, branding, and developer tools. All free.
            </p>
          </div>

          <div className="flex flex-col gap-14">
            {FEATURE_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                {/* Category header */}
                <div className="scroll-reveal flex items-center gap-4 mb-6">
                  <span
                    className="shrink-0 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                    style={{ background: cat.accentBg, color: cat.accent }}
                  >
                    {cat.label}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to right, ${cat.dividerColor}, transparent)` }}
                  />
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.features.map(({ Icon, title, desc }, i) => (
                    <div
                      key={title}
                      className="scroll-reveal bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 text-left card-glow-hover group cursor-default"
                      data-delay={String(i * 70)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200"
                        style={{ background: cat.accentBg }}
                      >
                        <Icon size={20} style={{ color: cat.accent }} strokeWidth={1.8} />
                      </div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">{title}</h3>
                      <p className="text-[var(--text-secondary)] text-xs mt-1.5 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it Works ── */}
        <section
          className="px-6 py-24 border-y border-[var(--border)]"
          style={{ background: "var(--bg-deep, var(--bg-card))" }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14 scroll-reveal">
              <p className="text-xs font-semibold tracking-widest text-[var(--accent-warm)] uppercase mb-3">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
                Eliminate the back-and-forth in 3 steps
              </h2>
              <p className="text-[var(--text-secondary)] mt-3 text-base max-w-lg mx-auto">
                Share your availability link. Guest self-schedules. Google Meet event is created automatically. Done.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
              <div className="hidden sm:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-[var(--border-accent)] to-transparent" />
              {STEPS.map(({ Icon, n, title, desc }, i) => (
                <div
                  key={n}
                  className="scroll-reveal flex flex-col items-center text-center gap-4"
                  data-delay={String(150 * i)}
                >
                  <div
                    className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-[rgba(59,106,232,0.3)] animate-float"
                    style={{ animationDelay: `${i * 0.8}s` }}
                  >
                    <Icon size={28} className="text-white" strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-[var(--accent)] uppercase">{n}</span>
                  <h3 className="font-bold text-[var(--text-primary)] text-base">{title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison Table ── */}
        <section className="px-6 py-24 max-w-3xl mx-auto w-full">
          <div className="text-center mb-14 scroll-reveal">
            <p className="text-xs font-semibold tracking-widest text-[var(--accent-warm)] uppercase mb-3">vs. the competition</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              DraftMeet vs{" "}
              <span className="text-gradient-brand">Calendly</span>
            </h2>
            <p className="text-[var(--text-secondary)] mt-3 text-base">
              We give you paid features — for free.
            </p>
          </div>

          <div className="scroll-reveal overflow-x-auto rounded-2xl border border-[var(--border)]" style={{ boxShadow: "var(--shadow-card)" }}>
            <table className="w-full text-sm min-w-[440px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-6 py-4 text-[var(--text-secondary)] font-semibold w-1/2">Feature</th>
                  <th className="px-6 py-4 text-center cmp-dm-header">DraftMeet ✦</th>
                  <th className="px-6 py-4 text-center text-[var(--text-secondary)] font-semibold">Calendly</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map(({ feature, dm, cal, calBad }, i) => (
                  <tr
                    key={feature}
                    className={`border-b border-[var(--border)] last:border-none transition-colors ${i % 2 !== 0 ? "bg-[var(--bg-deep)]/30" : ""}`}
                  >
                    <td className="px-6 py-4 text-[var(--text-primary)] font-medium">{feature}</td>
                    <td className="px-6 py-4 text-center cmp-dm-cell">
                      <span className="cmp-check-yes">✓</span>{" "}
                      <span className="badge-free">{dm}</span>
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--text-secondary)]">
                      {calBad ? (
                        <span><span className="cmp-check-no">✗</span> {cal}</span>
                      ) : (
                        <span><span className="cmp-check-yes">✓</span> {cal}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="px-6 py-24 max-w-3xl mx-auto w-full">
          <div className="text-center mb-12 scroll-reveal">
            <p className="text-xs font-semibold tracking-widest text-[var(--accent-warm)] uppercase mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Frequently asked questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map(({ q, a }, i) => (
              <details
                key={q}
                className="scroll-reveal bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl group overflow-hidden"
                data-delay={String(80 * i)}
              >
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer list-none font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                  <span>{q}</span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-[var(--text-secondary)] transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="px-6 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="relative px-6 py-28 flex flex-col items-center gap-7 text-center overflow-hidden border-t border-[var(--border)]">
          <div
            className="absolute inset-0 pointer-events-none orb-pulse"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
          />
          <div className="relative z-10 flex flex-col items-center gap-7 max-w-xl scroll-reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-accent)] text-[var(--accent)] text-xs font-semibold">
              <Sparkles size={13} />
              {IS_LIVE ? "Free to start" : "Limited early access"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
              Start scheduling in{" "}
              <span className="text-gradient-brand">under 2 minutes</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-base leading-relaxed">
              {IS_LIVE
                ? "Create your free DraftMeet account and send your first booking link in under 2 minutes — no credit card required."
                : "Join the waitlist and be the first to get free early access to DraftMeet — the scheduling tool that eliminates back-and-forth for good."}
            </p>
            <div className="w-full max-w-md">
              {IS_LIVE ? (
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-warm-gradient text-white font-semibold text-sm shadow-lg glow-warm hover:brightness-110 hover:-translate-y-0.5 active:scale-[0.97] active:brightness-95 transition-all duration-150"
                >
                  <Zap size={15} />
                  Create free account
                </Link>
              ) : (
                <>
                  <WaitlistForm />
                  <p className="text-xs text-[var(--text-secondary)] mt-3">No spam, ever.</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="px-6 py-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-secondary)] text-xs max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <Image src="/logo-light.png" alt="DraftMeet" width={20} height={20} className="logo-light rounded" />
            <Image src="/logo-dark.png"  alt="DraftMeet" width={20} height={20} className="logo-dark  rounded" />
            <span className="font-semibold text-[var(--text-primary)]">DraftMeet</span>
            <span className="mx-2 opacity-40">·</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
          </div>
        </footer>
      </main>

      {/* IntersectionObserver scroll reveal — runs after HTML is parsed */}
      <script dangerouslySetInnerHTML={{ __html: scrollRevealScript }} />
    </>
  );
}
