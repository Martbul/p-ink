"use client";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, Textarea, Badge } from "@/components/ui";

function PromptCard() {
  return (
    <div
      className="relative rounded-2xl p-8 overflow-hidden text-cream"
      style={{ background: "var(--deep)" }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 80% 20%, rgba(196,113,74,0.18) 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        <p className="text-eyebrow mb-3" style={{ color: "var(--blush)" }}>
          Day 24 · Today's prompt
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-light italic leading-snug mb-5">
          "If you could relive one moment from the last year together, which
          would it be?"
        </h2>
        <span
          className="inline-block px-3 py-1 rounded-full text-xs tracking-widest uppercase"
          style={{
            background: "rgba(232,197,176,0.12)",
            color: "var(--blush)",
          }}
        >
          memories
        </span>
      </div>
    </div>
  );
}

function YourAnswerCard() {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    // TODO: POST /api/answers { daily_entry_id, answer_text: text }
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--terra)" }}
        />
        <h3 className="font-display text-xl font-normal text-deep">
          Your answer
        </h3>
      </div>
      <p className="text-xs text-muted mb-5">
        Only visible to you until you submit.
      </p>

      {submitted ? (
        <div
          className="rounded-xl px-4 py-4 animate-fade-in"
          style={{
            background: "rgba(196,113,74,0.07)",
            border: "1px solid rgba(196,113,74,0.15)",
          }}
        >
          <p className="font-display italic text-base text-deep leading-relaxed mb-3">
            "{text}"
          </p>
          <p
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--terra)" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Submitted — the frame will update shortly.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Textarea
            rows={4}
            placeholder="Write your answer…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            variant="primary"
            disabled={!text.trim()}
            loading={loading}
            onClick={submit}
          >
            Submit answer
          </Button>
        </div>
      )}
    </Card>
  );
}

function PartnerAnswerCard() {
  const answered = true; // swap to false to see waiting state

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--gold)" }}
        />
        <h3 className="font-display text-xl font-normal text-deep">
          Alex's answer
        </h3>
      </div>
      <p className="text-xs text-muted mb-5">
        {answered ? "Answered 2 hours ago." : "Hasn't answered yet."}
      </p>

      {answered ? (
        <div
          className="rounded-xl px-4 py-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(184,147,90,0.07), rgba(196,113,74,0.04))",
            border: "1px solid rgba(184,147,90,0.18)",
          }}
        >
          <p className="font-display italic text-base text-deep leading-relaxed">
            "That evening on the terrace in Porto when the lights came on across
            the city and neither of us said anything for a long time."
          </p>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
          style={{ background: "var(--warm)" }}
        >
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--blush)" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--blush)", animationDelay: "0.2s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--blush)", animationDelay: "0.4s" }}
            />
          </div>
          <p className="font-display italic text-sm text-muted">
            Alex is thinking…
          </p>
        </div>
      )}
    </Card>
  );
}

function FrameStatusCard() {
  const online = true;
  return (
    <Card padding="md">
      <div className="flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: online ? "rgba(90,138,106,0.1)" : "var(--warm)",
            color: online ? "var(--success)" : "var(--muted)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-normal text-deep">Your frame</p>
          <p className="text-xs text-muted mt-0.5">
            Last seen 4 minutes ago · AA:BB:CC:DD:EE:FF
          </p>
        </div>
        <Badge variant={online ? "online" : "offline"}>
          {online ? "Online" : "Offline"}
        </Badge>
      </div>
    </Card>
  );
}

function StreakCard() {
  return (
    <Card padding="md" className="text-center">
      <p
        className="font-display text-7xl font-light leading-none mb-1"
        style={{ color: "var(--terra)" }}
      >
        24
      </p>
      <p className="text-xs uppercase tracking-widest text-muted mb-2">
        Day streak 🔥
      </p>
      <p className="text-xs text-muted">Both answered every day this month</p>
    </Card>
  );
}

function TodaysPhotoCard() {
  return (
    <Card padding="none" className="overflow-hidden">
      {/* Photo area */}
      <div
        className="h-44 flex flex-col items-center justify-center gap-2"
        style={{
          background: "linear-gradient(135deg, var(--warm), var(--blush))",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.6"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p className="text-xs text-white/60 uppercase tracking-widest">
          Today's photo · from Alex
        </p>
      </div>
      <div className="p-5">
        <p className="text-sm font-normal text-deep mb-1">
          Porto, October 2024
        </p>
        <p className="text-xs text-muted leading-relaxed">
          This photo will fade at midnight and a new one from your queue appears
          tomorrow.
        </p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppLayout>
      <div className="page-enter">
        {/* Header */}
        <div className="mb-10">
          <p className="text-eyebrow mb-2">{today}</p>
          <h1 className="font-display text-5xl font-light text-deep">
            Good morning, <em className="italic text-terra">Sofia.</em>
          </h1>
          <p className="text-base text-muted mt-2" style={{ fontWeight: 300 }}>
            Alex answered today's prompt 2 hours ago.
          </p>
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-5">
          {/* Prompt — full width */}
          <PromptCard />

          {/* Answers — 2 col */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <YourAnswerCard />
            <PartnerAnswerCard />
          </div>

          {/* Status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FrameStatusCard />
            <StreakCard />
          </div>

          {/* Today's photo */}
          <TodaysPhotoCard />
        </div>
      </div>
    </AppLayout>
  );
}
