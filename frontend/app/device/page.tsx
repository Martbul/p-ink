"use client";

import { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUser } from "@/providers/UserProvider";
import { cn } from "@/lib/utils";

const polyClip = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
const polyTiny = "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

// ─── Data ────────────────────────────────────────────────────────────────────

const BACKGROUNDS = [
  { id: "default", label: "Void", color: "#0a0a0f", preview: "bg-[#0a0a0f]", accent: "neon-blue" },
  { id: "grid", label: "Grid", color: "#050510", preview: "bg-[#050510]", accent: "neon-blue", hasGrid: true },
  { id: "warm", label: "Amber", color: "#1a1000", preview: "bg-[#1a1000]", accent: "yellow" },
  { id: "forest", label: "Forest", color: "#001a00", preview: "bg-[#001a00]", accent: "green" },
  { id: "deep", label: "Deep", color: "#10001a", preview: "bg-[#10001a]", accent: "neon-purple" },
  { id: "dusk", label: "Dusk", color: "#1a0010", preview: "bg-[#1a0010]", accent: "neon-pink" },
];

const COMPANIONS = [
  {
    id: "ghost",
    name: "SPECTER",
    emoji: "👻",
    desc: "A floating companion that pulses with your heartbeat. Gets brighter when your partner is online.",
    mood: "curious",
    level: 3,
    color: "neon-blue",
  },
  {
    id: "cat",
    name: "NEKO_V1",
    emoji: "🐱",
    desc: "An 8-bit cat that sleeps when inactive, wakes for new messages, and reacts to photos.",
    mood: "sleepy",
    level: 5,
    color: "neon-purple",
  },
  {
    id: "plant",
    name: "BONSAI",
    emoji: "🌱",
    desc: "A digital plant that grows as your couple streak increases. Wilts if you miss a day.",
    mood: "growing",
    level: 2,
    color: "green-400",
  },
  {
    id: "robot",
    name: "UNIT_7",
    emoji: "🤖",
    desc: "A retro robot that delivers messages with flair. Displays affection levels in binary.",
    mood: "energetic",
    level: 4,
    color: "yellow-400",
  },
  {
    id: "star",
    name: "NOVA",
    emoji: "⭐",
    desc: "A constellation that forms new star patterns for each memory you create together.",
    mood: "dreamy",
    level: 1,
    color: "neon-pink",
  },
  {
    id: "fox",
    name: "KITSUNE",
    emoji: "🦊",
    desc: "A mythical fox that guards your messages. Its tails multiply with each milestone.",
    mood: "mischievous",
    level: 6,
    color: "orange-400",
  },
];

const DISPLAY_MODES = [
  {
    id: "prompt",
    icon: "💬",
    label: "Daily Prompt",
    desc: "Shows today's couple question. Hides until both partners respond.",
    active: true,
  },
  {
    id: "photo",
    icon: "📷",
    label: "Photo Cycle",
    desc: "Rotates through your uploaded photos throughout the day.",
    active: false,
  },
  {
    id: "clock",
    icon: "🕐",
    label: "Dual Clock",
    desc: "Displays both timezones simultaneously. Keeps you in each other's day.",
    active: false,
  },
  {
    id: "streak",
    icon: "🔥",
    label: "Streak Board",
    desc: "Visualizes your consecutive days of connection. Motivating data display.",
    active: false,
  },
  {
    id: "weather",
    icon: "🌤",
    label: "Shared Weather",
    desc: "Shows weather at both locations side by side.",
    active: false,
    comingSoon: true,
  },
  {
    id: "spotify",
    icon: "🎵",
    label: "Listening Together",
    desc: "Displays what your partner is currently playing. Requires Spotify link.",
    active: false,
    comingSoon: true,
  },
];

const ACTIONS = [
  {
    id: "refresh",
    label: "Force Refresh",
    desc: "Push a manual update to the display now.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
    color: "neon-blue",
  },
  {
    id: "blank",
    label: "Blank Screen",
    desc: "Clear the display temporarily. Perfect for privacy.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        <line x1="2" y1="9" x2="22" y2="9" />
      </svg>
    ),
    color: "white",
  },
  {
    id: "restart",
    label: "Restart Device",
    desc: "Soft restart the e-ink terminal remotely.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 2v6h-6" />
        <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
      </svg>
    ),
    color: "yellow-400",
  },
  {
    id: "test",
    label: "Send Test Pattern",
    desc: "Display a diagnostic pattern to verify hardware health.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    color: "neon-purple",
  },
];

// ─── Inline E-Ink Frame Mockup ────────────────────────────────────────────────
function EInkPreview({ bg, companion, mode }: { bg: typeof BACKGROUNDS[0]; companion: typeof COMPANIONS[0] | null; mode: string }) {
  return (
    <div className="relative w-full aspect-[3/4] max-w-[220px] mx-auto">
      {/* Outer bezel */}
      <div className="absolute inset-0 bg-[#1a1a1a] rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]" />
      {/* Screen */}
      <div
        className={cn("absolute inset-[10px] rounded-sm overflow-hidden transition-colors duration-700", bg.preview)}
        style={{ backgroundColor: bg.color }}
      >
        {bg.hasGrid && (
          <div className="absolute inset-0 bg-[linear-gradient(rgba(5,217,232,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(5,217,232,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />
        )}

        {/* Content based on mode */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {mode === "prompt" && (
            <>
              <div className="text-[5px] font-mono text-white/30 uppercase tracking-widest mb-3">[ DAILY_TX ]</div>
              <p className="text-[7px] font-mono text-white/80 leading-relaxed mb-3">
                &quot;What made you smile today?&quot;
              </p>
              <div className="w-8 h-px bg-white/20 mb-3" />
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/20 rounded-full" />
                <div className="w-2 h-2 bg-white/60 rounded-full" />
              </div>
            </>
          )}
          {mode === "photo" && (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="text-lg">📷</span>
            </div>
          )}
          {mode === "clock" && (
            <>
              <div className="text-[10px] font-mono text-white/50 mb-1">LOCAL</div>
              <div className="text-[16px] font-mono text-white font-bold mb-3">08:42</div>
              <div className="w-8 h-px bg-white/20 mb-3" />
              <div className="text-[10px] font-mono text-white/50 mb-1">REMOTE</div>
              <div className="text-[16px] font-mono text-white/70 font-bold">14:42</div>
            </>
          )}
          {mode === "streak" && (
            <>
              <div className="text-[9px] font-mono text-white/40 uppercase mb-2">streak</div>
              <div className="text-[28px] font-mono text-white font-black">47</div>
              <div className="text-[8px] font-mono text-white/30">days connected</div>
            </>
          )}
        </div>

        {/* Companion */}
        {companion && (
          <div className="absolute bottom-3 right-3 text-base animate-bounce" style={{ animationDuration: "3s" }}>
            {companion.emoji}
          </div>
        )}
      </div>
      {/* Power LED */}
      <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-neon-blue rounded-full shadow-[0_0_6px_rgba(5,217,232,0.8)] animate-pulse" />
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, title, accent }: { label: string; title: React.ReactNode; accent: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px w-6 bg-white/20" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted">{label}</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <h2 className="font-display text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
        {title}
      </h2>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DevicePage() {
  const { device, couple, coupleDevices, user } = useUser();

  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
  const [selectedCompanion, setSelectedCompanion] = useState<typeof COMPANIONS[0] | null>(null);
  const [selectedMode, setSelectedMode] = useState("prompt");
  const [activeModes, setActiveModes] = useState<string[]>(["prompt"]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(80);
  const [refreshInterval, setRefreshInterval] = useState(60);

  const myDevice = coupleDevices.find((d) => d.device.owner_id === user?.id);
  const online = myDevice?.device?.last_seen
    ? Date.now() - new Date(myDevice.device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  function toggleMode(id: string) {
    setActiveModes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
    setSelectedMode(id);
  }

  async function runAction(id: string) {
    setActionLoading(id);
    await new Promise((r) => setTimeout(r, 1800));
    setActionLoading(null);
    setActionDone(id);
    setTimeout(() => setActionDone(null), 3000);
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-dark text-white pt-12 pb-32 relative">
        {/* CRT overlay */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">

          {/* ─── Page Header ─────────────────────────────────────────────── */}
          <div className="mb-16 border-b border-white/10 pb-10 relative animate-fade-in">
            <div className="absolute left-0 bottom-0 w-1/2 h-px bg-gradient-to-r from-neon-blue to-transparent" />
            <div className="flex items-start justify-between flex-wrap gap-6">
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-neon-pink block animate-pulse" />
                  HARDWARE_CONTROL_CENTER
                </p>
                <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none">
                  Device <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple text-glow-pink italic">Terminal.</span>
                </h1>
                <p className="font-mono text-xs text-text-muted mt-5 border-l-2 border-neon-pink/50 pl-3 py-1 bg-neon-pink/5 max-w-xl leading-relaxed uppercase">
                  Configure your e-ink display, personalize its appearance, choose a companion, and manage hardware actions.
                </p>
              </div>

              {/* Live device badge */}
              <div className="bg-surface-dark border border-white/10 p-5 min-w-[200px]" style={{ clipPath: polyClip }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-muted mb-3">Connected Unit</p>
                {myDevice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", online ? "bg-neon-blue shadow-[0_0_8px_rgba(5,217,232,0.8)] animate-pulse" : "bg-white/20")} />
                      <span className={cn("font-mono text-xs font-bold uppercase", online ? "text-neon-blue" : "text-text-muted")}>
                        {online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-white/60">{myDevice.device.mac_address}</p>
                    {myDevice.device.firmware && (
                      <p className="font-mono text-[9px] text-text-muted">FW: {myDevice.device.firmware}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-mono text-[10px] text-red-400 uppercase mb-2">&gt; No device linked</p>
                    <Link href="/dashboard" className="font-mono text-[10px] text-neon-blue underline underline-offset-2 uppercase">
                      Pair from dashboard →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── How It Works (Brief) ──────────────────────────────────────── */}
          <section className="mb-20 animate-fade-up">
            <SectionHeader label="SYSTEM_OVERVIEW" title={<>How It <span className="text-neon-blue italic">Works.</span></>} accent="neon-blue" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: "01",
                  color: "neon-blue",
                  clip: polyClip,
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  ),
                  title: "Always-On Display",
                  desc: "Your e-ink frame uses near-zero power. It stays on without drawing current — the image is physically locked into the display until the next update.",
                },
                {
                  step: "02",
                  color: "neon-purple",
                  clip: polyClipReverse,
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  ),
                  title: "Cloud-Synced Updates",
                  desc: "When you or your partner send a message, photo, or prompt response — the backend pushes a render job and the frame pulls the new image via WiFi.",
                },
                {
                  step: "03",
                  color: "neon-pink",
                  clip: polyClip,
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  ),
                  title: "Midnight Reset",
                  desc: "At 00:00 in your configured timezone, the frame clears. Daily prompts expire, giving each day a fresh beginning.",
                },
              ].map((item) => (
                <div key={item.step} className={`relative bg-surface-dark border border-white/5 p-6 hover:border-${item.color}/40 transition-all group`} style={{ clipPath: item.clip }}>
                  <div className="absolute top-3 right-4 font-mono text-5xl font-black text-white/[0.04] group-hover:text-white/[0.07] transition-colors">{item.step}</div>
                  <div className={`w-10 h-10 flex items-center justify-center bg-${item.color}/10 border border-${item.color}/40 text-${item.color} mb-4`} style={{ clipPath: polySmall }}>
                    {item.icon}
                  </div>
                  <h3 className="font-display text-lg font-black text-white uppercase tracking-wide mb-2">{item.title}</h3>
                  <p className="font-mono text-[11px] text-text-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Main Config + Preview Grid ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8 mb-20">

            {/* LEFT: Config */}
            <div className="flex flex-col gap-12">

              {/* Display Mode */}
              <section className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <SectionHeader label="DISPLAY_MODE" title={<>Display <span className="text-neon-blue italic">Mode.</span></>} accent="neon-blue" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DISPLAY_MODES.map((mode) => {
                    const isActive = activeModes.includes(mode.id);
                    return (
                      <button
                        key={mode.id}
                        onClick={() => !mode.comingSoon && toggleMode(mode.id)}
                        disabled={mode.comingSoon}
                        className={cn(
                          "relative text-left p-5 border transition-all duration-300 group",
                          isActive
                            ? "border-neon-blue bg-neon-blue/5 shadow-[0_0_20px_rgba(5,217,232,0.1)]"
                            : "border-white/10 bg-surface-dark hover:border-white/30",
                          mode.comingSoon && "opacity-40 cursor-not-allowed"
                        )}
                        style={{ clipPath: polySmall }}
                      >
                        {mode.comingSoon && (
                          <span className="absolute top-2 right-2 font-mono text-[8px] text-yellow-400 border border-yellow-400/30 px-1.5 py-0.5 uppercase tracking-widest" style={{ clipPath: polyTiny }}>
                            Soon
                          </span>
                        )}
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{mode.icon}</span>
                          <div>
                            <p className="font-display text-sm font-black text-white uppercase tracking-wide mb-1">{mode.label}</p>
                            <p className="font-mono text-[10px] text-text-muted leading-relaxed">{mode.desc}</p>
                          </div>
                        </div>
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-blue to-transparent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Background */}
              <section className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <SectionHeader label="VISUAL_THEME" title={<>Background <span className="text-neon-purple italic">Theme.</span></>} accent="neon-purple" />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBg(bg)}
                      className={cn(
                        "group flex flex-col items-center gap-2 p-3 border transition-all",
                        selectedBg.id === bg.id
                          ? "border-neon-purple bg-neon-purple/10"
                          : "border-white/10 hover:border-white/30"
                      )}
                      style={{ clipPath: polySmall }}
                    >
                      <div
                        className="w-full aspect-square rounded-sm border border-white/10 relative overflow-hidden"
                        style={{ backgroundColor: bg.color }}
                      >
                        {bg.hasGrid && (
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(5,217,232,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(5,217,232,0.2)_1px,transparent_1px)] bg-[length:8px_8px]" />
                        )}
                      </div>
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">{bg.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Companion */}
              <section className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <SectionHeader
                  label="COMPANION_MATRIX"
                  title={<>Choose a <span className="text-neon-pink italic">Companion.</span></>}
                  accent="neon-pink"
                />
                <p className="font-mono text-[11px] text-text-muted mb-6 leading-relaxed border-l-2 border-neon-pink/30 pl-3 py-1">
                  &gt; A digital companion lives on your frame. It reacts to messages, grows with your streak, and keeps the display alive.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {COMPANIONS.map((c) => {
                    const isSelected = selectedCompanion?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCompanion(isSelected ? null : c)}
                        className={cn(
                          "relative text-left p-5 border transition-all duration-300 overflow-hidden group",
                          isSelected
                            ? "border-neon-pink bg-neon-pink/5 shadow-[0_0_20px_rgba(255,42,109,0.15)]"
                            : "border-white/10 bg-surface-dark hover:border-white/30"
                        )}
                        style={{ clipPath: isSelected ? polyClipReverse : polyClip }}
                      >
                        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", `from-neon-pink/5 to-transparent`)} />
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl">{c.emoji}</span>
                            <div className="flex items-center gap-1 font-mono text-[8px] text-text-muted uppercase">
                              <span>LVL</span>
                              <span className="text-neon-pink font-bold">{c.level}</span>
                            </div>
                          </div>
                          <p className="font-mono text-[10px] font-bold text-white uppercase tracking-widest mb-1">{c.name}</p>
                          <p className="font-mono text-[9px] text-text-muted leading-relaxed">{c.desc}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="font-mono text-[8px] text-text-muted uppercase">Mood:</span>
                            <span className="font-mono text-[8px] text-neon-pink uppercase">{c.mood}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-neon-pink flex items-center justify-center" style={{ clipPath: polyTiny }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Hardware Controls */}
              <section className="animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <SectionHeader label="HARDWARE_CONFIG" title={<>Hardware <span className="text-yellow-400 italic">Controls.</span></>} accent="yellow" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Brightness */}
                  <div className="bg-surface-dark border border-white/10 p-6" style={{ clipPath: polyClip }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Contrast Level</p>
                      <span className="font-mono text-sm text-white font-bold">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-neon-blue h-1 rounded-none"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="font-mono text-[8px] text-text-muted uppercase">Low</span>
                      <span className="font-mono text-[8px] text-text-muted uppercase">High</span>
                    </div>
                  </div>

                  {/* Refresh rate */}
                  <div className="bg-surface-dark border border-white/10 p-6" style={{ clipPath: polyClipReverse }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">Refresh Every</p>
                      <span className="font-mono text-sm text-white font-bold">{refreshInterval}m</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={240}
                      step={5}
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="w-full accent-neon-purple h-1 rounded-none"
                    />
                    <div className="flex justify-between mt-2">
                      <span className="font-mono text-[8px] text-text-muted uppercase">5m</span>
                      <span className="font-mono text-[8px] text-text-muted uppercase">4h</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ACTIONS.map((action) => {
                    const isLoading = actionLoading === action.id;
                    const isDone = actionDone === action.id;
                    return (
                      <button
                        key={action.id}
                        onClick={() => runAction(action.id)}
                        disabled={isLoading || !myDevice}
                        className={cn(
                          "group relative flex flex-col items-center gap-3 p-5 border transition-all duration-300",
                          isDone
                            ? "border-neon-blue bg-neon-blue/10"
                            : `border-white/10 bg-surface-dark hover:border-${action.color}/50 hover:bg-${action.color}/5`,
                          !myDevice && "opacity-30 cursor-not-allowed"
                        )}
                        style={{ clipPath: polySmall }}
                      >
                        <div className={cn(
                          "text-text-muted transition-colors",
                          isDone ? "text-neon-blue" : `group-hover:text-${action.color}`
                        )}>
                          {isLoading ? (
                            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                          ) : isDone ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : action.icon}
                        </div>
                        <span className={cn("font-mono text-[9px] uppercase tracking-widest text-center leading-relaxed transition-colors", isDone ? "text-neon-blue" : "text-text-muted group-hover:text-white")}>
                          {isDone ? "Done!" : action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

            </div>

            {/* RIGHT: Live Preview */}
            <div className="lg:sticky lg:top-24 lg:self-start animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="bg-surface-dark border border-white/10 p-6" style={{ clipPath: polyClip }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-muted mb-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neon-pink animate-pulse" />
                  Live Preview
                </p>
                <EInkPreview
                  bg={selectedBg}
                  companion={selectedCompanion}
                  mode={activeModes[activeModes.length - 1] ?? "prompt"}
                />
                <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-muted uppercase">Theme</span>
                    <span className="font-mono text-[9px] text-white uppercase">{selectedBg.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-muted uppercase">Companion</span>
                    <span className="font-mono text-[9px] text-white uppercase">{selectedCompanion?.name ?? "None"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-muted uppercase">Mode</span>
                    <span className="font-mono text-[9px] text-white uppercase">
                      {DISPLAY_MODES.find((m) => m.id === (activeModes[activeModes.length - 1] ?? "prompt"))?.label ?? "—"}
                    </span>
                  </div>
                </div>
                <button
                  className="mt-5 w-full py-3 bg-neon-pink/10 border border-neon-pink text-neon-pink font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-neon-pink hover:text-white transition-all"
                  style={{ clipPath: polySmall }}
                  onClick={() => runAction("refresh")}
                  disabled={!myDevice}
                >
                  Apply & Push //
                </button>
              </div>
            </div>

          </div>


          {/* ─── Save Banner ─────────────────────────────────────────────── */}
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-bg-dark/90 backdrop-blur-md py-4 px-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-neon-pink animate-pulse" />
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                  Unsaved changes — theme: <span className="text-white">{selectedBg.label}</span>
                  {selectedCompanion && <> · companion: <span className="text-neon-pink">{selectedCompanion.name}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="px-5 py-2 border border-white/20 text-text-muted font-mono text-[10px] uppercase tracking-widest hover:border-white/40 hover:text-white transition-all"
                  style={{ clipPath: polyTiny }}
                >
                  Reset
                </button>
                <button
                  className="px-6 py-2 bg-neon-pink/10 border border-neon-pink text-neon-pink font-mono text-[10px] uppercase font-bold tracking-widest hover:bg-neon-pink hover:text-white transition-all shadow-[0_0_15px_rgba(255,42,109,0.2)]"
                  style={{ clipPath: polyTiny }}
                  onClick={() => runAction("refresh")}
                >
                  Save & Sync Device //
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}