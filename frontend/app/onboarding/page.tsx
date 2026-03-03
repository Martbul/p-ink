"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  "Europe/Sofia", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

const TZ_LABELS: Record<string, string> = {
  "Europe/Sofia":        "EU // SOFIA",
  "Europe/London":       "EU // LONDON",
  "Europe/Paris":        "EU // PARIS",
  "Europe/Berlin":       "EU // BERLIN",
  "America/New_York":    "NA // NEW_YORK",
  "America/Chicago":     "NA // CHICAGO",
  "America/Los_Angeles": "NA // LOS_ANGELES",
  "Asia/Tokyo":          "AS // TOKYO",
  "Asia/Singapore":      "AS // SINGAPORE",
  "Australia/Sydney":    "OC // SYDNEY",
};

const polyClip        = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall       = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
const polyTiny        = "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, createCouple } = useUser();

  const detected   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultTz  = TIMEZONES.includes(detected) ? detected : "UTC";

  const [timezone, setTimezone] = useState(defaultTz);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const firstName = user?.name?.split(" ")[0]?.toUpperCase() ?? "OPERATOR";

  async function handleContinue() {
    setLoading(true);
    setError("");
    try {
      await createCouple(timezone);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message ?? "Initialization failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden selection:bg-neon-blue/30 selection:text-white">

      {/* CRT scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-neon-blue/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-neon-purple/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Logo */}
      <Link
        href="/"
        className="relative z-10 font-display text-2xl font-black tracking-widest text-white uppercase flex items-center gap-2 mb-16 group"
      >
        <span className="text-neon-pink group-hover:text-glow-pink transition-all">P-INK</span>
        <span className="text-[10px] font-mono text-neon-blue border border-neon-blue/40 px-1 py-0.5 rounded-sm">
          BOOT_SEQ
        </span>
      </Link>

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-lg bg-surface/80 border border-white/10 backdrop-blur-md p-10 md:p-12 animate-fade-up"
        style={{ clipPath: polyClip }}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-neon-blue to-transparent opacity-60" />

        {/* Step badge */}
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neon-blue mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-neon-blue animate-pulse" />
          INIT_SEQ: 01 &nbsp;// SYSTEM CONFIGURATION
        </p>

        {/* Heading */}
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none mb-4">
          Welcome,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple italic">
            [{firstName}].
          </span>
        </h1>

        <p className="font-mono text-sm text-text-muted leading-relaxed mb-10 border-l-2 border-neon-blue/40 pl-4 py-1 bg-neon-blue/5">
          &gt; p-ink links you and your partner through a shared e-ink terminal.
          Before we boot the system, set your timezone so the frame resets at
          the correct midnight.
        </p>

        {/* Timezone selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
              Timezone_Config
            </label>
            <span
              className="font-mono text-[9px] text-neon-blue border border-neon-blue/30 px-2 py-0.5 uppercase tracking-widest"
              style={{ clipPath: polyTiny }}
            >
              Auto-detected: {detected}
            </span>
          </div>

          {/* Custom styled select wrapper */}
          <div className="relative">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full appearance-none bg-bg-dark border border-white/20 px-4 py-3 font-mono text-sm text-white focus:border-neon-blue focus:outline-none cursor-pointer hover:border-white/40 transition-colors pr-10"
              style={{ clipPath: polySmall }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-bg-dark text-white">
                  {TZ_LABELS[tz] ?? tz}
                </option>
              ))}
            </select>
            {/* Dropdown arrow */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neon-blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* Selected zone readout */}
          <div
            className="mt-3 flex items-center gap-3 px-3 py-2 bg-neon-blue/5 border border-neon-blue/20"
            style={{ clipPath: polyTiny }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#05d9e8" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono text-[10px] text-neon-blue uppercase tracking-widest">
              Frame resets at 00:00 &nbsp;·&nbsp; {timezone}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/40 flex items-center gap-3"
            style={{ clipPath: polySmall }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="font-mono text-[10px] text-red-400 uppercase tracking-widest">
              &gt; ERR: {error}
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center gap-4 py-4 border-2 font-mono font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 relative overflow-hidden group",
            loading
              ? "border-neon-blue/40 text-neon-blue/40 cursor-not-allowed bg-transparent"
              : "border-neon-blue text-neon-blue bg-neon-blue/10 hover:bg-neon-blue hover:text-bg-dark shadow-[0_0_20px_rgba(5,217,232,0.2)] hover:shadow-[0_0_40px_rgba(5,217,232,0.5)]"
          )}
          style={{ clipPath: polySmall }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin" />
              Initializing System...
            </>
          ) : (
            <>
              Initialize System
              <span className="font-mono text-xs group-hover:translate-x-1 transition-transform">&gt;&gt;</span>
            </>
          )}
        </button>

        {/* Footer note */}
        <p className="mt-6 font-mono text-[9px] text-text-muted/50 uppercase tracking-widest text-center">
          [ Timezone can be updated later in system settings ]
        </p>
      </div>

      {/* Progress dots */}
      <div className="relative z-10 flex items-center gap-3 mt-10">
        <div className="w-6 h-1 bg-neon-blue shadow-[0_0_8px_rgba(5,217,232,0.8)]" style={{ clipPath: polyTiny }} />
        <div className="w-3 h-1 bg-white/20" style={{ clipPath: polyTiny }} />
        <div className="w-3 h-1 bg-white/20" style={{ clipPath: polyTiny }} />
        <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest ml-2">Step 1 of 3</span>
      </div>
    </div>
  );
}