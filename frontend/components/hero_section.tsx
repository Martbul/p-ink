"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";

const PROMPTS = [
  "What made you smile today?",
  "Describe your perfect Sunday morning.",
  "What song reminds you of us?",
  "Where do you want to travel together next?",
  "What's a memory of us you'd keep forever?",
  "If you could call me right now, what's the first thing you'd say?",
];

function PromptCarousel() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % PROMPTS.length);
        setVisible(true);
      }, 400);
    }, 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <p
      className="font-display italic text-lg text-mid text-center transition-all duration-400"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        minHeight: "30px",
      }}
    >
      "{PROMPTS[idx]}"
    </p>
  );
}

function FloatingPetals() {
  const petals = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 8 + Math.random() * 12,
    delay: Math.random() * 14,
    duration: 16 + Math.random() * 10,
    opacity: 0.12 + Math.random() * 0.2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.4,
            opacity: p.opacity,
            borderRadius: "50% 0 50% 0",
            background: "var(--blush)",
            animationName: "floatPetal",
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <FloatingPetals />

      {/* Radial bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 65% 40%, rgba(196,113,74,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 md:px-14 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <span className="text-eyebrow animate-fade-up delay-0 block mb-5">
            For couples who live apart
          </span>

          <h1 className="text-display-xl text-deep animate-fade-up delay-100 mb-7">
            Stay close,
            <br />
            <em className="italic text-terra">across any</em>
            <br />
            distance.
          </h1>

          <p
            className="text-lg leading-relaxed text-mid max-w-md mb-10 animate-fade-up delay-200"
            style={{ fontWeight: 300 }}
          >
            A shared e-ink frame on your desk. A daily question. Two answers
            that fade together as the day passes — turning distance into
            something beautiful.
          </p>

          {submitted ? (
            <p
              className="font-display text-xl italic animate-pop-in"
              style={{ color: "var(--terra)" }}
            >
              You're on the list. We'll be in touch soon ♡
            </p>
          ) : (
            <form
              className="flex gap-3 flex-wrap animate-fade-up delay-300"
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubmitted(true);
              }}
            >
              <input
                type="email"
                className="field-input flex-1 min-w-[220px]"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-primary whitespace-nowrap"
                style={{
                  background: "var(--terra)",
                  color: "white",
                  padding: "12px 28px",
                  borderRadius: "100px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Join waitlist
              </button>
            </form>
          )}

          <p className="text-xs text-muted mt-4 animate-fade-up delay-400">
            No spam. First to know when frames ship.
          </p>
        </div>

        {/* Right */}
        <div className="hidden lg:flex flex-col items-center gap-6">
          <FrameMiniMockup size="lg" />
          <PromptCarousel />

          {/* Pairing code display */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {"483920".split("").map((d, i) => (
                <div
                  key={i}
                  className="w-11 h-14 flex items-center justify-center rounded-xl font-display text-2xl text-deep bg-white border border-blush"
                  style={{
                    boxShadow: "0 2px 8px rgba(196,113,74,0.08)",
                    animationName: "popIn",
                    animationDuration: "0.4s",
                    animationDelay: `${i * 80}ms`,
                    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
                    animationFillMode: "both",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted tracking-widest uppercase">
              Frame pairing code
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
