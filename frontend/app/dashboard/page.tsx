"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, Textarea, Badge, Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";

// ─── Setup banners ────────────────────────────────────────────────────────────
// Shown on dashboard until the user completes each action.
// Always dismissible and always re-accessible via Settings.

function PairFrameBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      className="relative flex items-start gap-4 rounded-2xl p-5"
      style={{ background: "var(--warm)", border: "1px solid rgba(232,197,176,0.6)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--blush)", color: "var(--terra)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-deep mb-0.5">Pair your e-ink frame</p>
        <p className="text-xs text-muted leading-relaxed">
          Power on the frame and enter its MAC address to connect it to your account.
        </p>
        <button
          className="text-xs text-terra hover:underline mt-2"
          onClick={() => router.push("/settings")}
        >
          Pair frame in Settings →
        </button>
      </div>
      <button
        className="text-muted hover:text-deep transition-colors shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function InvitePartnerBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div
      className="relative flex items-start gap-4 rounded-2xl p-5"
      style={{ background: "rgba(217,126,139,0.06)", border: "1px solid rgba(217,126,139,0.2)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(217,126,139,0.1)", color: "var(--rose)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-deep mb-0.5">Invite your partner</p>
        <p className="text-xs text-muted leading-relaxed">
          Generate an invite link and share it. Once they join, the frame comes alive.
        </p>
        <button
          className="text-xs text-rose hover:underline mt-2"
          onClick={() => router.push("/settings")}
        >
          Generate invite link in Settings →
        </button>
      </div>
      <button
        className="text-muted hover:text-deep transition-colors shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}


function PromptCard() {
  return (
    <div
      className="relative rounded-2xl p-8 overflow-hidden text-cream"
      style={{ background: "var(--deep)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 70% at 80% 20%, rgba(196,113,74,0.18) 0%, transparent 60%)" }} />
      <div className="relative">
        <p className="text-eyebrow mb-3" style={{ color: "var(--blush)" }}>Today&apos;s prompt</p>
        <h2 className="font-display text-3xl md:text-4xl font-light italic leading-snug mb-5">
          &rdquo;If you could relive one moment from the last year together, which would it be?&rdquo;
        </h2>
        <span className="inline-block px-3 py-1 rounded-full text-xs tracking-widest uppercase" style={{ background: "rgba(232,197,176,0.12)", color: "var(--blush)" }}>
          memories
        </span>
      </div>
    </div>
  );
}

function YourAnswerCard() {
  const { sendMessage } = useUser();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      await sendMessage(text);
      setSubmitted(true);
    } catch (error) {
      const err = error as Error;
      setError(err.message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--terra)" }} />
        <h3 className="font-display text-xl font-normal text-deep">Your answer</h3>
      </div>
      <p className="text-xs text-muted mb-5">Only visible to you until you submit.</p>
      {submitted ? (
        <div className="rounded-xl px-4 py-4 animate-fade-in" style={{ background: "rgba(196,113,74,0.07)", border: "1px solid rgba(196,113,74,0.15)" }}>
          <p className="font-display italic text-base text-deep leading-relaxed mb-3">&rdquo;{text}&rdquo;</p>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--terra)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
            Submitted — the frame will update shortly.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Textarea rows={4} placeholder="Write your answer…" value={text} onChange={(e) => setText(e.target.value)} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button variant="primary" disabled={!text.trim()} loading={loading} onClick={submit}>Submit answer</Button>
        </div>
      )}
    </Card>
  );
}

function PartnerAnswerCard({ partnerName }: { partnerName: string }) {
  const { content, user } = useUser();
  const latest = content.find((c) => c.type === "message" && c.sent_to === user?.id);
  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />
        <h3 className="font-display text-xl font-normal text-deep">{partnerName}&apos;s answer</h3>
      </div>
      <p className="text-xs text-muted mb-5">{latest ? "Answered recently." : "Hasn't answered yet."}</p>
      {latest?.message_text ? (
        <div className="rounded-xl px-4 py-4" style={{ background: "linear-gradient(135deg, rgba(184,147,90,0.07), rgba(196,113,74,0.04))", border: "1px solid rgba(184,147,90,0.18)" }}>
          <p className="font-display italic text-base text-deep leading-relaxed">&rdquo;{latest.message_text}&rdquo;</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: "var(--warm)" }}>
          <div className="flex gap-1">
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--blush)", animationDelay: `${d}s` }} />
            ))}
          </div>
          <p className="font-display italic text-sm text-muted">{partnerName} is thinking…</p>
        </div>
      )}
    </Card>
  );
}

function FrameStatusCard() {
  const { device } = useUser();
  const online = device?.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  if (!device) return null;

  return (
    <Card padding="md">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: online ? "rgba(90,138,106,0.1)" : "var(--warm)", color: online ? "var(--success)" : "var(--muted)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-normal text-deep">Your frame</p>
          <p className="text-xs text-muted mt-0.5">
            {device.last_seen ? `Last seen ${new Date(device.last_seen).toLocaleTimeString()} · ` : "Never seen · "}
            {device.mac_address}
          </p>
        </div>
        <Badge variant={online ? "online" : "offline"}>{online ? "Online" : "Offline"}</Badge>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, couple, partnerUser, device, isLoading, error } = useUser();

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Spinner /></div></AppLayout>;
  }

  if (error) {
    return <AppLayout><div className="p-6 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div></AppLayout>;
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const partnerName = partnerUser?.name?.split(" ")[0] ?? "your partner";
  const coupleActive = couple?.status === "active";

  return (
    <AppLayout>
      <div className="page-enter">
        {/* Header */}
        <div className="mb-8">
          <p className="text-eyebrow mb-2">{today}</p>
          <h1 className="font-display text-5xl font-light text-deep">
            Good morning, <em className="italic text-terra">{firstName}.</em>
          </h1>
          {coupleActive && (
            <p className="text-base text-muted mt-2" style={{ fontWeight: 300 }}>
              Connected with {partnerName}.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-5">
          {/* Setup banners — only shown when action is still needed */}
          {!device && <PairFrameBanner />}
          {!coupleActive && <InvitePartnerBanner />}

          {/* Main content — shown once couple is active */}
          {coupleActive ? (
            <>
              <PromptCard />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <YourAnswerCard />
                <PartnerAnswerCard partnerName={partnerName} />
              </div>
              {device && <FrameStatusCard />}
            </>
          ) : (
            <Card padding="md">
              <p className="font-display text-xl italic text-muted text-center py-4">
                Waiting for {partnerName} to join…
              </p>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}