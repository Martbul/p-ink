"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";
import { useAuth } from "@clerk/nextjs";

// --- CUSTOM CYBERPUNK SHAPES ---
// We use inline clip-paths to kill the standard rectangles
const polyClip =
  "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse =
  "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

const PROMPTS = [
  "What made you smile today?",
  "Describe your perfect Sunday morning.",
  "What song reminds you of us?",
  "Where do you want to travel together next?",
];

const STEPS = [
  {
    step: "01",
    label: "INITIATE",
    title: "Link the System",
    desc: "Boot up the e-ink terminal. It syncs to the localized network and outputs a pairing sequence. Enter the code on your mobile HUD.",
  },
  {
    step: "02",
    label: "TRANSMIT",
    title: "Dual Uplink",
    desc: "A daily query generates at 08:00. Both users transmit data asynchronously. The physical display unifies the data only when both signals lock.",
  },
  {
    step: "03",
    label: "RESET",
    title: "Midnight Fade",
    desc: "Memory blocks hold for the diurnal cycle. At 00:00 local time, the display clears the buffer, establishing space for tomorrow.",
  },
];

// 1. HUD Navigation (Replaces standard top bar)
const CyberNav = () => {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center justify-between px-6 py-4 bg-surface/80 backdrop-blur-md border border-neon-blue/30 shadow-[0_0_20px_rgba(5,217,232,0.15)] relative overflow-hidden"
        style={{ clipPath: polyClip }}
      >
        {/* Animated scanline in Nav */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-display text-2xl font-black tracking-widest text-white uppercase flex items-center gap-2 group"
          >
            <span className="text-neon-pink group-hover:text-glow-pink transition-all">
              P-INK
            </span>
            <span className="text-[10px] font-mono text-neon-blue border border-neon-blue/40 px-1 py-0.5 rounded-sm">
              v1.0
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-[0.2em] uppercase">
          <a
            href="#architecture"
            className="text-text-muted hover:text-neon-purple transition-colors"
          >
            Architecture
          </a>
          <a
            href="#specs"
            className="text-text-muted hover:text-neon-pink transition-colors"
          >
            Specs
          </a>

          <Link
            href="/auth"
            className="relative px-6 py-2 bg-neon-pink/10 border border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white transition-all duration-300"
            style={{
              clipPath:
                "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
            }}
          >
            Connect [ + ]
          </Link>
        </div>
      </div>
    </nav>
  );
};

// 2. Immersive Dashboard Hero
const HeroDashboard = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIdx((i) => (i + 1) % PROMPTS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-dark pt-20">
      {/* Immersive Background: Synthwave Sun & 3D Grid Floor */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-t from-neon-pink to-transparent rounded-full opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] perspective-1000">
        <div
          className="w-[200%] h-[200%] ml-[-50%] mt-[-20%] grid-bg transform rotate-x-[75deg] opacity-40 border-t border-neon-blue shadow-[0_-10px_30px_rgba(5,217,232,0.2)]"
          style={{ transformOrigin: "top center" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Text & Terminal Input */}
        <div className="lg:col-span-7 flex flex-col gap-6 relative">
          <div className="absolute -left-10 top-0 h-full w-px bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-50 hidden md:block" />

          <div className="flex items-center gap-3 text-neon-blue font-mono text-xs uppercase tracking-[0.3em]">
            <span className="w-2 h-2 bg-neon-blue animate-pulse" />
            System Online // Long-Distance Link
          </div>

          <h1 className="text-display-xl text-white uppercase tracking-tighter leading-[0.9]">
            Shared <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple text-glow-pink italic pr-4">
              Consciousness
            </span>
          </h1>

          <p className="text-lg text-text-muted font-light max-w-lg mt-4 border-l-2 border-neon-purple/50 pl-4 bg-gradient-to-r from-neon-purple/10 to-transparent py-2">
            A physical e-ink terminal on your desk. A daily prompt. Two inputs
            that dissolve at cycle end. Proximity simulated through synchronized
            data.
          </p>

          {/* Terminal Style Input */}
          <div className="mt-8">
            {submitted ? (
              <div
                className="bg-surface/80 border border-neon-blue p-4 font-mono text-neon-blue w-fit"
                style={{ clipPath: polyClipReverse }}
              >
                &gt; USER LINK ESTABLISHED. AWAITING HARDWARE...
              </div>
            ) : (
              <form
                className="flex flex-col sm:flex-row gap-0 max-w-xl"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) setSubmitted(true);
                }}
              >
                <div
                  className="flex-1 flex items-center bg-surface/90 border-y border-l border-white/20 px-4 py-4 font-mono"
                  style={{
                    clipPath:
                      "polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)",
                  }}
                >
                  <span className="text-neon-pink mr-3">&gt;</span>
                  <input
                    type="email"
                    className="bg-transparent outline-none text-white w-full placeholder:text-text-muted/40"
                    placeholder="ENTER_EMAIL_ID_"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="w-2 h-5 bg-neon-blue animate-pulse ml-2" />
                </div>
                <button
                  type="submit"
                  className="bg-neon-pink hover:bg-white hover:text-neon-pink text-white font-bold uppercase tracking-widest px-8 py-4 transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                  }}
                >
                  Join Net
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Floating Dashboard Element (Collage feel) */}
        <div className="lg:col-span-5 relative h-[500px] flex items-center justify-center mt-10 lg:mt-0">
          {/* Background Decorative Data Plates */}
          <div
            className="absolute top-10 right-0 w-64 h-32 border border-white/5 bg-surface/40 backdrop-blur-md font-mono text-[10px] text-text-muted p-4 -rotate-6"
            style={{ clipPath: polyClip }}
          >
            SYS_LOG: <br />
            [+] CALIBRATING SYNC...
            <br />
            [+] LATENCY: 14ms
            <br />
            [+] WAITING FOR USER 2...
          </div>

          <div
            className="absolute bottom-10 left-0 w-72 p-4 border-l-2 border-neon-blue bg-surface-light/80 backdrop-blur-xl z-20 shadow-2xl"
            style={{ clipPath: polyClipReverse }}
          >
            <p className="font-mono text-xs text-neon-blue mb-1 uppercase tracking-widest">
              Incoming Transmission
            </p>
            <p className="font-display italic text-lg text-white">
              &quot;{PROMPTS[promptIdx]}&quot;
            </p>
          </div>

          {/* Main Frame Mockup */}
          <div
            className="relative z-10 animate-float p-2 border border-neon-pink/30 bg-black/50 backdrop-blur-lg shadow-[0_0_50px_rgba(255,42,109,0.3)]"
            style={{ clipPath: polyClip }}
          >
            <FrameMiniMockup size="lg" />

            {/* Corner bracket accents */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-neon-pink" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-neon-pink" />
          </div>
        </div>
      </div>
    </section>
  );
};

// 3. Flow Architecture (Replaces horizontal 3-column cards)
// Uses an alternating vertical timeline (Circuit board feel)
const ArchitectureFlow = () => {
  return (
    <section
      id="architecture"
      className="relative py-32 bg-surface-dark overflow-hidden"
    >
      {/* Center Circuit Line */}
      <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-bg-dark via-neon-purple to-bg-dark" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div
          className="text-center mb-24 relative inline-block left-1/2 -translate-x-1/2 bg-surface-dark px-8 py-4 border border-neon-purple/30"
          style={{ clipPath: polyClip }}
        >
          <p className="text-neon-purple font-mono text-xs tracking-[0.4em] uppercase mb-2">
            Operation Protocol
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
            System{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-blue">
              Architecture
            </span>
          </h2>
        </div>

        <div className="flex flex-col gap-20">
          {STEPS.map((s, i) => {
            const isEven = i % 2 === 0;
            return (
              <div
                key={s.step}
                className={cn(
                  "relative flex flex-col md:flex-row items-center gap-8 md:gap-16",
                  isEven ? "md:flex-row" : "md:flex-row-reverse",
                )}
              >
                {/* Connecting Node */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-4 h-4 bg-bg-dark border-2 border-neon-purple rotate-45 z-20 shadow-[0_0_15px_rgba(177,34,229,0.8)]" />

                {/* Content Panel */}
                <div
                  className={cn(
                    "w-full md:w-1/2 pl-16 md:pl-0",
                    isEven ? "md:pr-16 md:text-right" : "md:pl-16 text-left",
                  )}
                >
                  <div
                    className="relative p-8 bg-surface border border-white/5 hover:border-neon-purple/50 transition-colors group"
                    style={{ clipPath: isEven ? polyClipReverse : polyClip }}
                  >
                    <div
                      className={cn(
                        "absolute -top-6 text-7xl font-black text-white/5 group-hover:text-neon-purple/20 transition-colors font-mono",
                        isEven ? "right-4" : "left-4",
                      )}
                    >
                      {s.step}
                    </div>
                    <span className="inline-block px-2 py-1 bg-neon-purple/20 text-neon-purple font-mono text-[10px] tracking-widest uppercase mb-4">
                      {s.label}
                    </span>
                    <h3 className="text-2xl font-display text-white mb-3 uppercase tracking-wide group-hover:text-neon-blue transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-text-muted leading-relaxed text-sm font-mono">
                      {s.desc}
                    </p>
                  </div>
                </div>

                {/* Empty space for the other half of the grid */}
                <div className="hidden md:block w-1/2" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// 4. Hardware Specs (Replaces grid rectangles with an angled collage)
const SpecsCollage = () => {
  return (
    <section
      id="specs"
      className="py-32 relative bg-bg-dark border-y border-white/10 overflow-hidden"
    >
      {/* Background Japanese typography / aesthetic marks */}
      <div className="absolute top-10 right-10 text-[150px] font-black text-white/[0.02] writing-vertical-rl pointer-events-none select-none">
        接続システム
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 border-l-4 border-neon-pink pl-6 py-2">
          <p className="text-neon-pink font-mono text-xs tracking-[0.3em] uppercase mb-2">
            Hardware & Software
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
            Technical <span className="text-glow-pink italic">Specs</span>
          </h2>
        </div>

        {/* Collage Layout - Overlapping angled panels */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
          {/* Panel 1 */}
          <div
            className="md:col-span-7 bg-surface p-8 relative overflow-hidden group border-t border-white/10"
            style={{ clipPath: polyClip }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-neon-blue mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h3 className="text-xl text-white font-display uppercase tracking-widest mb-2">
              100+ Data Prompts
            </h3>
            <p className="text-text-muted font-mono text-sm">
              Deep, nostalgic, and varied inputs. The algorithmic system ensures
              zero query repetition. Constantly rotating psychological
              engagement.
            </p>
          </div>

          {/* Panel 2 (Offset/overlapping slightly visually) */}
          <div
            className="md:col-span-5 md:mt-12 bg-surface-light p-8 border-r-2 border-neon-purple shadow-[0_0_30px_rgba(177,34,229,0.1)]"
            style={{ clipPath: polyClipReverse }}
          >
            <div className="text-neon-purple mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h3 className="text-xl text-white font-display uppercase tracking-widest mb-2">
              Visual Queue
            </h3>
            <p className="text-text-muted font-mono text-sm">
              Upload encrypted imagery from your mobile HUD. The physical
              terminal cycles through synchronized memory banks daily.
            </p>
          </div>

          {/* Panel 3 */}
          <div
            className="md:col-span-4 bg-surface-dark p-8 border border-white/5 mt-6"
            style={{ clipPath: polyClip }}
          >
            <div className="text-neon-pink mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="text-xl text-white font-display uppercase tracking-widest mb-2">
              00:00 Auto-Reset
            </h3>
            <p className="text-text-muted font-mono text-sm">
              Signals fade at 00:00 local, clearing the cache for the next
              cycle.
            </p>
          </div>

          {/* Panel 4 - Wide block */}
          <div
            className="md:col-span-8 bg-surface p-8 mt-6 border-b-2 border-neon-blue relative"
            style={{
              clipPath:
                "polygon(0 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))",
            }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none mix-blend-screen" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="text-neon-blue p-4 bg-bg-dark rounded-full border border-neon-blue/30 shadow-[0_0_15px_rgba(5,217,232,0.4)]">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl text-white font-display uppercase tracking-widest mb-2">
                  E-ink Display Protocol
                </h3>
                <p className="text-text-muted font-mono text-sm">
                  Zero blue light radiation. Persistent low-power display. High
                  contrast organic readability matching paper standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// 5. Final CTA Sequence
const CTASequence = () => {
  return (
    <section className="py-32 px-6 relative flex flex-col items-center justify-center text-center overflow-hidden bg-bg-dark">
      {/* Target Crosshair Decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-neon-pink/10 rounded-full pointer-events-none border-dashed animate-[spin_60s_linear_infinite]" />

      <div
        className="relative z-10 max-w-2xl bg-surface/40 backdrop-blur-xl p-12 border border-neon-blue/20"
        style={{ clipPath: polyClip }}
      >
        <p className="text-neon-blue font-mono text-xs tracking-[0.4em] uppercase mb-4 animate-pulse">
          &gt; SYSTEM OVERRIDE AVAILABLE
        </p>
        <h2 className="text-5xl font-display font-black text-white uppercase tracking-tighter mb-6">
          Initialize <br />{" "}
          <span className="text-glow-blue text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white italic">
            Hardware Run?
          </span>
        </h2>
        <p className="text-text-muted font-mono text-sm mb-10 border-l-2 border-white/20 pl-4 text-left inline-block">
          p-ink units are currently in fabrication. <br />
          Register ID to lock in unit 001 allocation.
        </p>

        <br />

        <Link
          href="/auth/sign-up"
          className="inline-flex items-center gap-4 bg-neon-blue/10 border-2 border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-bg-dark font-black uppercase tracking-[0.2em] px-10 py-4 transition-all duration-300 shadow-[0_0_20px_rgba(5,217,232,0.2)] hover:shadow-[0_0_40px_rgba(5,217,232,0.6)] group"
          style={{
            clipPath:
              "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)",
          }}
        >
          <span>Secure Hardware</span>
          <span className="font-mono text-xs group-hover:translate-x-2 transition-transform">
            &gt;&gt;
          </span>
        </Link>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-6 px-6 border-t border-white/10 bg-bg-dark text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-text-muted uppercase tracking-widest">
      <div className="flex items-center gap-2">
        <span className="text-neon-pink">P-INK</span>
        <span>OS_VERSION: 2026.1</span>
      </div>
      <div>[ SECURE CONNECTION ESTABLISHED ]</div>
    </footer>
  );
};

export default function HomePage() {
  return (
    <main className="bg-bg-dark min-h-screen text-text-main relative selection:bg-neon-pink/30 selection:text-white">
      <div className="fixed inset-0 pointer-events-none z-[100] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

      <CyberNav />
      <HeroDashboard />
      <ArchitectureFlow />
      <SpecsCollage />
      <CTASequence />
      <Footer />
    </main>
  );
}
