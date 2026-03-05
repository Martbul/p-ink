"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const poly =
  "polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)";
const polyLg =
  "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polySm =
  "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      style={{
        filter:
          "drop-shadow(0 0 8px rgba(5,217,232,0.5)) drop-shadow(0 0 20px rgba(177,34,229,0.3))",
      }}
    >
      <defs>
        <linearGradient
          id="lm-f"
          x1="0"
          y1="0"
          x2="120"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#05d9e8" />
          <stop offset="100%" stopColor="#b122e5" />
        </linearGradient>
        <linearGradient
          id="lm-h"
          x1="30"
          y1="42"
          x2="90"
          y2="85"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ff2a6d" />
          <stop offset="100%" stopColor="#b122e5" />
        </linearGradient>
      </defs>
      <path
        d="M18 8 L102 8 L112 18 L112 102 L102 112 L18 112 L8 102 L8 18 Z"
        stroke="url(#lm-f)"
        strokeWidth="2"
        fill="rgba(5,217,232,0.04)"
      />
      <line x1="8" y1="28" x2="8" y2="18" stroke="#05d9e8" strokeWidth="3" />
      <line x1="8" y1="18" x2="18" y2="18" stroke="#05d9e8" strokeWidth="3" />
      <line x1="102" y1="8" x2="112" y2="8" stroke="#b122e5" strokeWidth="3" />
      <line x1="112" y1="8" x2="112" y2="18" stroke="#b122e5" strokeWidth="3" />
      <line
        x1="112"
        y1="102"
        x2="112"
        y2="112"
        stroke="#05d9e8"
        strokeWidth="3"
      />
      <line
        x1="112"
        y1="112"
        x2="102"
        y2="112"
        stroke="#05d9e8"
        strokeWidth="3"
      />
      <line x1="18" y1="112" x2="8" y2="112" stroke="#b122e5" strokeWidth="3" />
      <line x1="8" y1="112" x2="8" y2="102" stroke="#b122e5" strokeWidth="3" />
      <path
        d="M60 82 C60 82 32 65 32 48 C32 39 39 33 47 33 C52 33 56 36 60 40 C64 36 68 33 73 33 C81 33 88 39 88 48 C88 65 60 82 60 82Z"
        stroke="url(#lm-h)"
        strokeWidth="2.5"
        fill="rgba(255,42,109,0.12)"
      />
    </svg>
  );
}

function FeatureCard({
  icon,
  label,
  title,
  body,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative p-7 border transition-all duration-300 group cursor-default"
      style={{
        clipPath: poly,
        background: "rgba(255,255,255,0.02)",
        borderColor: hovered ? `${color}55` : `${color}20`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute top-0 left-0 pointer-events-none">
        <div
          className="absolute top-0 left-0 w-4 h-px"
          style={{ background: color }}
        />
        <div
          className="absolute top-0 left-0 w-px h-4"
          style={{ background: color }}
        />
      </div>
      <div className="absolute bottom-0 right-0 pointer-events-none">
        <div
          className="absolute bottom-0 right-0 w-4 h-px"
          style={{ background: color }}
        />
        <div
          className="absolute bottom-0 right-0 w-px h-4"
          style={{ background: color }}
        />
      </div>
      {hovered && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 30%, ${color}08 0%, transparent 60%)`,
          }}
        />
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 flex items-center justify-center border"
            style={{
              clipPath: polySm,
              background: `${color}12`,
              borderColor: `${color}50`,
              color,
            }}
          >
            {icon}
          </div>
          <p
            className="font-mono text-[9px] tracking-[0.25em] uppercase"
            style={{ color: `${color}80` }}
          >
            {label}
          </p>
        </div>
        <h3
          className="font-display text-lg uppercase font-bold text-white tracking-wide mb-3"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h3>
        <p className="text-sm font-mono leading-relaxed text-white/40">
          {body}
        </p>
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 px-6 py-4 border border-white/10"
      style={{ clipPath: polySm, background: "rgba(255,255,255,0.03)" }}
    >
      <span
        className="font-display text-2xl font-bold text-white tracking-tight"
        style={{
          fontFamily: "'Syne', sans-serif",
          textShadow: "0 0 20px rgba(5,217,232,0.4)",
        }}
      >
        {value}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30">
        {label}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.4,
      c: Math.random() > 0.5 ? "#05d9e8" : "#b122e5",
      a: Math.random() * 0.35 + 0.08,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.c +
          Math.floor(p.a * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#080810", fontFamily: "'Space Mono', monospace" }}
    >
      {/* Particles */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0, opacity: 0.6 }}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.14) 3px, rgba(0,0,0,0.14) 4px)",
        }}
      />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(177,34,229,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(5,217,232,0.05) 0%, transparent 50%)",
        }}
      />

      <div className="relative" style={{ zIndex: 2 }}>
        <nav
          className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between"
          style={{
            background: "rgba(8,8,16,0.85)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <LogoMark size={30} />
            <div className="flex items-baseline">
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#fff",
                  letterSpacing: -1,
                }}
              >
                p
              </span>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                -
              </span>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  letterSpacing: -1,
                  background: "linear-gradient(135deg, #05d9e8, #b122e5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ink
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <button
                className="px-5 py-2 font-mono text-xs uppercase tracking-widest font-bold text-black"
                style={{
                  clipPath: polySm,
                  background: "linear-gradient(135deg, #05d9e8, #b122e5)",
                }}
              >
                Get started
              </button>
            </Link>
          </div>
        </nav>

        <section className="pt-40 pb-28 px-6 flex flex-col items-center text-center">
          <div
            className="mb-8 px-4 py-2 border border-cyan-400/20 flex items-center gap-3"
            style={{ clipPath: polySm, background: "rgba(5,217,232,0.05)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400/70">
              Signal active · v1.0
            </span>
          </div>

          <div
            className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                fontSize: "clamp(56px, 10vw, 130px)",
                lineHeight: 0.95,
                textShadow: "0 0 60px rgba(177,34,229,0.25)",
              }}
            >
              <span style={{ color: "#fff" }}>Stay</span>
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #05d9e8 0%, #b122e5 55%, #ff2a6d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 30px rgba(5,217,232,0.3))",
                }}
              >
                close.
              </span>
            </h1>
          </div>

          <div
            className={`transition-all duration-1000 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <p className="mt-6 mb-10 max-w-lg text-sm font-mono leading-relaxed text-white/40">
              {"> "}A shared e-ink frame that keeps long-distance couples
              connected through daily prompts, photos, and a tiny digital
              creature that thrives on attention.
            </p>
          </div>

          <div
            className={`flex flex-col sm:flex-row gap-4 items-center transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <Link href="/auth">
              <button
                className="relative px-10 py-4 font-mono text-sm font-bold uppercase tracking-widest text-black group transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  clipPath: poly,
                  background:
                    "linear-gradient(135deg, #05d9e8 0%, #b122e5 100%)",
                }}
              >
                <span className="relative z-10">Start transmitting</span>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </Link>
            <button
              className="px-8 py-4 font-mono text-sm uppercase tracking-widest text-white/50 border border-white/15 transition-all hover:text-white hover:border-white/30"
              style={{ clipPath: poly }}
            >
              See how it works ↓
            </button>
          </div>

          <div
            className={`mt-16 flex gap-4 flex-wrap justify-center transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <StatPill value="2.4k" label="Couples connected" />
            <StatPill value="98%" label="Daily sync rate" />
            <StatPill value="∞" label="Distance dissolved" />
          </div>
        </section>

        <section className="py-16 px-6 flex justify-center">
          <div className="relative max-w-sm w-full">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(177,34,229,0.18) 0%, rgba(5,217,232,0.08) 45%, transparent 70%)",
                transform: "scale(1.5)",
              }}
            />
            <div
              className="relative border-2 border-white/10 p-3"
              style={{
                clipPath: polyLg,
                background: "rgba(255,255,255,0.02)",
                boxShadow:
                  "0 0 40px rgba(5,217,232,0.08), 0 0 80px rgba(177,34,229,0.08), inset 0 0 30px rgba(0,0,0,0.5)",
              }}
            >
              {(
                [
                  "top-0 left-0",
                  "top-0 right-0",
                  "bottom-0 right-0",
                  "bottom-0 left-0",
                ] as const
              ).map((pos, i) => {
                const c = i % 2 === 0 ? "#05d9e8" : "#b122e5";
                const isR = pos.includes("right"),
                  isB = pos.includes("bottom");
                return (
                  <div
                    key={i}
                    className={`absolute ${pos} w-5 h-5 pointer-events-none`}
                  >
                    <div
                      style={{
                        position: "absolute",
                        [isB ? "bottom" : "top"]: 0,
                        [isR ? "right" : "left"]: 0,
                        width: 14,
                        height: 1,
                        background: c,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        [isB ? "bottom" : "top"]: 0,
                        [isR ? "right" : "left"]: 0,
                        width: 1,
                        height: 14,
                        background: c,
                      }}
                    />
                  </div>
                );
              })}
              <div
                className="aspect-[4/3] flex flex-col items-center justify-center gap-4 p-8 relative overflow-hidden"
                style={{ background: "rgba(8,8,16,0.75)" }}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20">
                  Today&apos;s prompt
                </div>
                <p
                  className="font-display text-center text-white/80 text-xl font-bold leading-tight"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  &ldquo;What song reminds you of us right now?&rdquo;
                </p>
                <div className="flex gap-2 mt-2">
                  {["bg-cyan-400", "bg-purple-400", "bg-pink-400"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${c} opacity-60 animate-pulse`}
                        style={{ animationDelay: `${i * 0.4}s` }}
                      />
                    ),
                  )}
                </div>
                <div
                  className="absolute left-0 right-0 h-px opacity-40"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #05d9e8, transparent)",
                    animation: "scan 4s linear infinite",
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-3 px-1">
              <span className="font-mono text-[9px] text-white/20 uppercase tracking-[0.2em]">
                p-ink frame
              </span>
              <span className="font-mono text-[9px] text-cyan-400/40 uppercase tracking-[0.2em]">
                ● Live
              </span>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
              Core systems
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              color="#05d9e8"
              label="SYS_01"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Daily Prompts"
              body="A new question every morning. Answer together. Build a shared archive of moments across any distance."
            />
            <FeatureCard
              color="#b122e5"
              label="SYS_02"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              }
              title="Shared Tamagotchi"
              body="A tiny creature that thrives when both of you engage. Neglect it together and watch it sulk on your frame."
            />
            <FeatureCard
              color="#ff2a6d"
              label="SYS_03"
              icon={
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              }
              title="Photo Frame"
              body="Push photos straight to your partner's e-ink display. Wake up to a surprise image. Stay present."
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 px-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <div className="h-px flex-1 bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
              Initialization sequence
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          {[
            {
              num: "01",
              title: "Create your couple",
              body: "Sign up, create a couple account, and generate an invite link for your partner.",
              color: "#05d9e8",
            },
            {
              num: "02",
              title: "Connect your frame",
              body: "Pair your e-ink device via the dashboard. It syncs automatically over Wi-Fi.",
              color: "#b122e5",
            },
            {
              num: "03",
              title: "Start transmitting",
              body: "Receive daily prompts, send photos, and watch your shared creature come to life.",
              color: "#ff2a6d",
            },
          ].map((s, i) => (
            <div key={i} className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 flex items-center justify-center border font-mono text-sm font-bold shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{
                    clipPath: polySm,
                    borderColor: `${s.color}50`,
                    color: s.color,
                    background: `${s.color}10`,
                  }}
                >
                  {s.num}
                </div>
                {i < 2 && (
                  <div
                    className="w-px my-2"
                    style={{
                      height: 48,
                      background: `linear-gradient(to bottom, ${s.color}30, transparent)`,
                    }}
                  />
                )}
              </div>
              <div className="pb-10 pt-1">
                <h3
                  className="font-display text-lg uppercase font-bold text-white tracking-wide mb-2"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm font-mono text-white/40 leading-relaxed">
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="py-32 px-6 flex flex-col items-center text-center">
          <div
            className="relative max-w-2xl w-full p-12 border border-white/10"
            style={{
              clipPath: polyLg,
              background:
                "linear-gradient(135deg, rgba(5,217,232,0.03) 0%, rgba(177,34,229,0.05) 100%)",
            }}
          >
            <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none">
              <div className="absolute top-0 left-0 w-5 h-px bg-cyan-400/60" />
              <div className="absolute top-0 left-0 w-px h-5 bg-cyan-400/60" />
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
              <div className="absolute bottom-0 right-0 w-5 h-px bg-purple-500/60" />
              <div className="absolute bottom-0 right-0 w-px h-5 bg-purple-500/60" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 mb-4">
              Final transmission
            </p>
            <h2
              className="text-4xl font-bold uppercase text-white mb-4 tracking-tight"
              style={{
                fontFamily: "'Syne', sans-serif",
                textShadow: "0 0 40px rgba(177,34,229,0.3)",
              }}
            >
              Distance is just
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #05d9e8, #ff2a6d)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                a setting.
              </span>
            </h2>
            <p className="font-mono text-sm text-white/40 mb-8 leading-relaxed">
              Join couples who choose presence over distance.
            </p>
            <Link href="/auth">
              <button
                className="px-10 py-4 font-mono text-sm font-bold uppercase tracking-widest text-black transition-transform hover:scale-[1.02]"
                style={{
                  clipPath: poly,
                  background:
                    "linear-gradient(135deg, #05d9e8, #b122e5 60%, #ff2a6d)",
                }}
              >
                Connect now →
              </button>
            </Link>
          </div>
        </section>

        <footer className="py-8 px-6 border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LogoMark size={20} />
              <span className="font-mono text-xs text-white/20 uppercase tracking-widest">
                p-ink
              </span>
            </div>
            <span className="font-mono text-[10px] text-white/15 uppercase tracking-[0.2em]">
              distance / dissolved © {new Date().getFullYear()}
            </span>
          </div>
        </footer>
      </div>

      <style>{`
        @keyframes scan {
          0%   { top: 5%;  opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 0.4; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
