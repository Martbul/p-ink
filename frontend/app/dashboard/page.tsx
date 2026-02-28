"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api";

function PairFramePanel({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const [mac, setMac] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handlePair() {
    if (!mac.trim()) return;
    setLoading(true);
    setError("");
    try {
      await pairDevice(mac.trim().toUpperCase());
      setOpen(false);
      onPaired();
    } catch (err) {
      setError((err as Error).message ?? "Pairing failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="group relative overflow-hidden rounded-3xl transition-all duration-500"
      style={{
        background:
          "linear-gradient(135deg, #1a0f0a 0%, #2c1810 60%, #3d2218 100%)",
        border: "1px solid rgba(196,113,74,0.2)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 90% 10%, rgba(196,113,74,0.15) 0%, transparent 60%)",
        }}
      />

      <div className="relative p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(196,113,74,0.15)",
                border: "1px solid rgba(196,113,74,0.25)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(196,113,74,0.9)"
                strokeWidth="1.8"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <p
                className="text-xs tracking-[0.15em] uppercase"
                style={{ color: "rgba(196,113,74,0.6)" }}
              >
                Step 1
              </p>
              <h3 className="font-display text-xl font-light text-cream">
                Pair your frame
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(196,113,74,0.8)",
                boxShadow: "0 0 6px rgba(196,113,74,0.5)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              className="text-xs"
              style={{ color: "rgba(196,113,74,0.55)" }}
            >
              Waiting
            </span>
          </div>
        </div>

        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "rgba(232,197,176,0.55)", fontWeight: 300 }}
        >
          Power on the e-ink frame and connect it to WiFi. Enter the MAC address
          shown on the display.
        </p>

        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="group/btn flex items-center gap-2.5 text-sm font-medium transition-all duration-200"
            style={{ color: "rgba(196,113,74,0.9)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 group-hover/btn:scale-110"
              style={{
                background: "rgba(196,113,74,0.12)",
                border: "1px solid rgba(196,113,74,0.25)",
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            Enter MAC address
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-mono outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(196,113,74,0.25)",
                  color: "rgba(232,197,176,0.9)",
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePair()}
              />
              <button
                onClick={handlePair}
                disabled={!mac.trim() || loading}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40"
                style={{ background: "rgba(196,113,74,0.85)", color: "white" }}
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  "Pair"
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-left"
              style={{ color: "rgba(196,113,74,0.45)" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Invite Partner Panel ─────────────────────────────────────────────────────

function InvitePartnerPanel() {
  const { getToken } = useAuth();
  const [inviteURL, setInviteURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const t = await getToken();
      if (!t) throw new Error("Not authenticated");
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } catch (err) {
      setError((err as Error).message ?? "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background:
          "linear-gradient(135deg, #0f0a14 0%, #1a0f1e 60%, #220f2a 100%)",
        border: "1px solid rgba(217,126,139,0.2)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 10% 90%, rgba(217,126,139,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative p-7">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(217,126,139,0.12)",
                border: "1px solid rgba(217,126,139,0.2)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(217,126,139,0.9)"
                strokeWidth="1.8"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <p
                className="text-xs tracking-[0.15em] uppercase"
                style={{ color: "rgba(217,126,139,0.55)" }}
              >
                Step 2
              </p>
              <h3 className="font-display text-xl font-light text-cream">
                Invite your partner
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(217,126,139,0.75)",
                boxShadow: "0 0 6px rgba(217,126,139,0.4)",
                animation: "pulse 2s ease-in-out 0.5s infinite",
              }}
            />
            <span
              className="text-xs"
              style={{ color: "rgba(217,126,139,0.5)" }}
            >
              Pending
            </span>
          </div>
        </div>

        <p
          className="text-sm leading-relaxed mb-6"
          style={{ color: "rgba(232,197,176,0.55)", fontWeight: 300 }}
        >
          Generate a link and share it. Your partner joins, you connect, the
          frame comes alive.
        </p>

        {!inviteURL ? (
          <button
            onClick={generate}
            disabled={loading}
            className="group/btn flex items-center gap-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-40"
            style={{ color: "rgba(217,126,139,0.9)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 group-hover/btn:scale-110"
              style={{
                background: "rgba(217,126,139,0.1)",
                border: "1px solid rgba(217,126,139,0.22)",
              }}
            >
              {loading ? (
                <span className="w-3 h-3 border border-rose-300/40 border-t-rose-300 rounded-full animate-spin" />
              ) : (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </span>
            Generate invite link
          </button>
        ) : (
          <div>
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(217,126,139,0.18)",
              }}
            >
              <span
                className="flex-1 text-xs font-mono truncate"
                style={{ color: "rgba(232,197,176,0.65)" }}
              >
                {inviteURL.replace("https://", "")}
              </span>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shrink-0"
                style={{
                  background: copied
                    ? "rgba(90,138,106,0.2)"
                    : "rgba(217,126,139,0.12)",
                  color: copied
                    ? "rgba(90,200,130,0.9)"
                    : "rgba(217,126,139,0.9)",
                  border: `1px solid ${copied ? "rgba(90,138,106,0.25)" : "rgba(217,126,139,0.22)"}`,
                }}
              >
                {copied ? (
                  <>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>{" "}
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>{" "}
                    Copy
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs mb-1" style={{ color: "#f87171" }}>
                {error}
              </p>
            )}
            <p className="text-xs" style={{ color: "rgba(232,197,176,0.3)" }}>
              Expires in 7 days.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Today Prompt ─────────────────────────────────────────────────────────────

function TodayPrompt() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8"
      style={{
        background: "linear-gradient(160deg, var(--deep) 0%, #1a0f0a 100%)",
        border: "1px solid rgba(232,197,176,0.07)",
      }}
    >
      <div
        className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, rgba(196,113,74,0.12) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 80%, rgba(217,126,139,0.07) 0%, transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-5">
          <div
            className="h-px flex-1"
            style={{ background: "rgba(232,197,176,0.12)" }}
          />
          <span
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: "rgba(232,197,176,0.35)" }}
          >
            Today&apos;s prompt
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "rgba(232,197,176,0.12)" }}
          />
        </div>
        <blockquote className="font-display text-2xl md:text-3xl font-light italic leading-snug text-cream/90 mb-6">
          "If you could relive one moment from the last year together, which
          would it be?"
        </blockquote>
        <span
          className="inline-block px-3 py-1 rounded-full text-xs tracking-[0.15em] uppercase"
          style={{
            background: "rgba(196,113,74,0.1)",
            color: "rgba(196,113,74,0.65)",
            border: "1px solid rgba(196,113,74,0.14)",
          }}
        >
          memories
        </span>
      </div>
    </div>
  );
}

// ─── Answer cards ─────────────────────────────────────────────────────────────

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
    } catch (err) {
      setError((err as Error).message ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "var(--cream)",
        border: "1px solid rgba(196,113,74,0.1)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--terra)" }}
        />
        <h3 className="font-display text-lg font-normal text-deep">
          Your answer
        </h3>
      </div>
      {submitted ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(196,113,74,0.05)",
            border: "1px solid rgba(196,113,74,0.1)",
          }}
        >
          <p className="font-display italic text-deep leading-relaxed mb-3">
            "{text}"
          </p>
          <p
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--terra)" }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sent to the frame
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            rows={4}
            placeholder="Write your answer…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: "rgba(196,113,74,0.03)",
              border: "1px solid rgba(196,113,74,0.12)",
              color: "var(--deep)",
              fontFamily: "var(--font-body)",
            }}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={!text.trim() || loading}
            className="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-200 disabled:opacity-40"
            style={{ background: "var(--terra)", color: "white" }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              "Submit answer →"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function PartnerAnswerCard({ partnerName }: { partnerName: string }) {
  const { content, user } = useUser();
  const latest = content.find(
    (c) => c.type === "message" && c.sent_to === user?.id,
  );
  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "var(--cream)",
        border: "1px solid rgba(184,147,90,0.1)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--gold)" }}
        />
        <h3 className="font-display text-lg font-normal text-deep">
          {partnerName}&apos;s answer
        </h3>
      </div>
      {latest?.message_text ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(184,147,90,0.05), rgba(196,113,74,0.02))",
            border: "1px solid rgba(184,147,90,0.12)",
          }}
        >
          <p className="font-display italic text-deep leading-relaxed">
            "{latest.message_text}"
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: "rgba(184,147,90,0.04)",
            border: "1px solid rgba(184,147,90,0.08)",
          }}
        >
          <div className="flex gap-1 shrink-0">
            {[0, 0.3, 0.6].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: "rgba(184,147,90,0.45)",
                  animationDelay: `${d}s`,
                }}
              />
            ))}
          </div>
          <p
            className="font-display italic text-sm"
            style={{ color: "rgba(74,52,40,0.45)" }}
          >
            {partnerName} is thinking…
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Frame strip ──────────────────────────────────────────────────────────────

function FrameStrip() {
  const { device } = useUser();
  if (!device) return null;
  const online = device.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
    : false;
  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
      style={{
        background: online ? "rgba(90,138,106,0.05)" : "rgba(232,197,176,0.25)",
        border: `1px solid ${online ? "rgba(90,138,106,0.12)" : "rgba(232,197,176,0.4)"}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: online ? "var(--success)" : "rgba(160,140,130,0.5)",
            boxShadow: online ? "0 0 6px rgba(90,138,106,0.45)" : "none",
          }}
        />
        <span className="text-sm text-deep">Frame</span>
        <span className="text-xs text-muted font-mono hidden sm:block">
          {device.mac_address}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {device.last_seen && (
          <span className="text-xs text-muted hidden sm:block">
            {new Date(device.last_seen).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
        <span
          className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{
            background: online
              ? "rgba(90,138,106,0.08)"
              : "rgba(160,140,130,0.08)",
            color: online ? "var(--success)" : "rgba(120,100,90,0.7)",
          }}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, couple, partnerUser, device, isLoading, error, refetch } =
    useUser();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div
          className="p-5 rounded-2xl text-sm"
          style={{
            background: "rgba(196,80,74,0.05)",
            border: "1px solid rgba(196,80,74,0.12)",
            color: "#c4504a",
          }}
        >
          {error}
        </div>
      </AppLayout>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const partnerName = partnerUser?.name?.split(" ")[0] ?? "your partner";
  const coupleActive = couple?.status === "active";
  const needsPairing = !device;
  const needsInvite = !coupleActive;

  return (
    <AppLayout>
      <div className="page-enter max-w-2xl">
        {/* Header */}
        <div className="mb-10">
          <p
            className="text-xs tracking-[0.18em] uppercase mb-3"
            style={{ color: "rgba(120,90,70,0.5)" }}
          >
            {today}
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-light text-deep leading-tight">
            Hello,{" "}
            <em className="italic" style={{ color: "var(--terra)" }}>
              {firstName}.
            </em>
          </h1>
          {coupleActive && (
            <p
              className="text-base mt-2"
              style={{ color: "var(--muted)", fontWeight: 300 }}
            >
              Connected with{" "}
              <span
                className="font-display italic"
                style={{ color: "var(--terra)" }}
              >
                {partnerName}
              </span>
              .
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Setup panels */}
          {(needsPairing || needsInvite) && (
            <>
              <div className="flex items-center gap-3">
                <div
                  className="h-px flex-1"
                  style={{ background: "rgba(196,113,74,0.12)" }}
                />
                <span
                  className="text-xs tracking-[0.18em] uppercase"
                  style={{ color: "rgba(120,90,70,0.45)" }}
                >
                  Get started
                </span>
                <div
                  className="h-px flex-1"
                  style={{ background: "rgba(196,113,74,0.12)" }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {needsPairing && <PairFramePanel onPaired={() => refetch()} />}
                {needsInvite && <InvitePartnerPanel />}
              </div>
            </>
          )}

          {/* Active content */}
          {coupleActive && (
            <>
              <TodayPrompt />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <YourAnswerCard />
                <PartnerAnswerCard partnerName={partnerName} />
              </div>
              <FrameStrip />
            </>
          )}

          {/* Waiting state */}
          {!coupleActive && (
            <div
              className="rounded-3xl p-10 text-center"
              style={{
                background: "rgba(232,197,176,0.12)",
                border: "1px dashed rgba(196,113,74,0.18)",
              }}
            >
              <p
                className="font-display text-2xl italic font-light"
                style={{ color: "rgba(120,90,70,0.35)" }}
              >
                Your daily prompt will appear here once you&apos;re connected.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
