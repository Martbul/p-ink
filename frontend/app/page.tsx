"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";


const PROMPTS =[
  "What made you smile today?",
  "Describe your perfect Sunday morning.",
  "What song reminds you of us?",
  "Where do you want to travel together next?",
  "What's a memory of us you'd keep forever?",
  "If you could call me right now, what's the first thing you'd say?",
];

const STEPS =[
  {
    n: "01",
    title: "Plug in the frame",
    desc: "Place the e-ink frame on your desk. It connects to WiFi and shows a pairing code. Enter it in the app — done.",
  },
  {
    n: "02",
    title: "Answer together",
    desc: "Each morning, a new question appears. Both partners answer from their phones. The frame updates when both have replied.",
  },
  {
    n: "03",
    title: "Watch it fade",
    desc: "Your answers and a shared photo live on the frame all day. At midnight they fade, making room for tomorrow.",
  },
];

const FEATURES =[
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    name: "100+ daily prompts",
    desc: "Across categories: deep, funny, nostalgic. Never the same question twice.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    name: "Shared photo queue",
    desc: "Upload from your phone. The frame cycles through your memories daily.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    name: "Midnight fade",
    desc: "Answers fade at midnight in your timezone, creating a gentle daily ritual.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    name: "E-ink display",
    desc: "No blue light. Always on. Readable in any light. Calm and beautiful.",
  },
];
const HomeNav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-14 h-20 transition-all duration-500",
        scrolled
          ? "bg-cream/80 backdrop-blur-xl shadow-sm border-b border-blush/30 py-4"
          : "bg-transparent py-6"
      )}
    >
      <Link
        href="/"
        className="font-display text-2xl font-light text-deep tracking-wide"
      >
        p<em className="italic text-rose">-ink</em>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <a
          href="#how"
          className="text-sm font-medium text-mid hover:text-rose transition-colors tracking-wide"
        >
          How it works
        </a>
        <a
          href="#features"
          className="text-sm font-medium text-mid hover:text-rose transition-colors tracking-wide"
        >
          Features
        </a>

        <Link
          href="/auth"
          className={cn(
            "btn bg-rose text-white hover:bg-deep px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
            // Shadows updated to use the new Rose and Deep RGB values
            "shadow-[0_4px_16px_rgba(217,126,139,0.3)] hover:shadow-[0_8px_24px_rgba(74,34,40,0.2)]"
          )}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
};

const PromptCarousel = () => {
  const [idx, setIdx] = useState(0);
  const[visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % PROMPTS.length);
        setVisible(true);
      }, 500); // Wait for fade out
    }, 4000);
    return () => clearInterval(timer);
  },[]);

  return (
    <div className="min-h-[40px] flex items-center justify-center">
      <p
        className={cn(
          "font-display italic text-xl text-rose text-center transition-all duration-500 ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        "{PROMPTS[idx]}"
      </p>
    </div>
  );
};

const FloatingPetals = () => {
  const [petals, setPetals] = useState<any[]>([]);

  // Calculate random values strictly on mount to prevent SSR hydration errors
  useEffect(() => {
    setPetals(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 8 + Math.random() * 14,
        delay: Math.random() * 15,
        duration: 18 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.25,
        isRose: Math.random() > 0.5,
      }))
    );
  },[]);

  if (petals.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-[50%_0_50%_0]"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.4,
            opacity: p.opacity,
            background: p.isRose ? "var(--color-rose)" : "var(--color-blush)",
            animation: `floatPetal ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

const HeroSection = () => {
  const [email, setEmail] = useState("");
  const[submitted, setSubmitted] = useState(false);

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden pt-20">
      {/* Soft atmospheric background blending */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blush/20 blur-[100px] pointer-events-none" />
      
      <FloatingPetals />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-8 md:px-14 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left Column */}
        <div className="max-w-xl">
          <span className="text-eyebrow text-rose animate-fade-up delay-0 block mb-6">
            For couples who live apart
          </span>

          <h1 className="text-display-xl text-deep animate-fade-up delay-100 mb-8 tracking-tight">
            Stay close,
            <br />
            <em className="italic text-rose pr-2">across any</em>
            <br />
            distance.
          </h1>

          <p className="text-lg leading-relaxed text-mid/90 mb-12 animate-fade-up delay-200 font-light">
            A shared e-ink frame on your desk. A daily question. Two answers
            that fade together as the day passes — turning distance into
            something beautiful.
          </p>

          {submitted ? (
            <div className="animate-pop-in bg-rose/10 border border-rose/20 rounded-2xl p-6">
              <p className="font-display text-2xl italic text-rose">
                You're on the list. We'll be in touch soon ♡
              </p>
            </div>
          ) : (
            <form
              className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300"
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubmitted(true);
              }}
            >
              <input
                type="email"
                className="field-input flex-1 bg-white/60 backdrop-blur-sm border-blush focus:border-rose focus:ring-4 focus:ring-rose/10"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn bg-rose text-white hover:bg-deep shadow-[0_8px_24px_rgba(212,144,122,0.25)] hover:shadow-[0_8px_24px_rgba(44,24,16,0.2)] py-3 px-8 text-base"
              >
                Join waitlist
              </button>
            </form>
          )}

          <p className="text-sm text-muted mt-5 animate-fade-up delay-400">
            No spam. First to know when frames ship.
          </p>
        </div>

        {/* Right Column */}
        <div className="hidden lg:flex flex-col items-center justify-center gap-10">
          <div className="relative animate-float">
            {/* Soft glow behind the frame */}
            <div className="absolute inset-0 bg-rose/20 blur-[60px] rounded-full scale-110" />
            <div className="relative">
              <FrameMiniMockup size="lg" />
            </div>
          </div>
          
          <div className="w-full max-w-sm">
             <PromptCarousel />
          </div>

          <div className="flex flex-col items-center gap-4 animate-fade-up delay-500">
            <div className="flex gap-3">
              {"483920".split("").map((d, i) => (
                <div
                  key={i}
                  className="w-12 h-16 flex items-center justify-center rounded-xl font-display text-3xl text-rose bg-white border border-blush/60 shadow-sm"
                  style={{
                    animationName: "popIn",
                    animationDuration: "0.5s",
                    animationDelay: `${i * 80 + 600}ms`,
                    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
                    animationFillMode: "both",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-medium text-muted tracking-[0.2em] uppercase">
              Frame pairing code
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  return (
    <section id="how" className="py-32 px-8 md:px-14 max-w-7xl mx-auto relative z-10">
      <div className="text-center md:text-left mb-20">
        <p className="text-eyebrow text-rose mb-4">The experience</p>
        <h2 className="text-display-lg text-deep">
          Simple by design,
          <br />
          <em className="italic text-rose">meaningful by nature.</em>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
        {STEPS.map((s) => (
          <div 
            key={s.n} 
            className="group p-8 md:p-10 rounded-3xl bg-white/40 border border-warm backdrop-blur-sm hover:bg-white hover:border-blush/50 transition-all duration-300 hover:shadow-xl hover:shadow-rose/5 hover:-translate-y-1"
          >
            <div className="font-display text-7xl font-light text-rose/30 mb-8 transition-colors group-hover:text-rose/50">
              {s.n}
            </div>
            <h3 className="font-display text-3xl text-deep mb-4">
              {s.title}
            </h3>
            <p className="text-base leading-relaxed text-mid/80 font-light">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 px-8 md:px-14 bg-deep relative overflow-hidden">
      {/* Decorative background glows for the dark section */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-terra/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center md:text-left mb-20">
          <p className="text-eyebrow text-blush mb-4">What's inside</p>
          <h2 className="text-display-lg text-cream">
            Built with <em className="italic text-rose">intention.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex flex-col gap-6 group cursor-default">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-rose/10 text-rose border border-rose/10 transition-colors group-hover:bg-rose group-hover:text-white">
                {f.icon}
              </div>
              <div>
                <h3 className="font-display text-2xl text-cream mb-3">
                  {f.name}
                </h3>
                <p className="text-base leading-relaxed text-cream/60 font-light">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CtaSection = () => {
  return (
    <section className="py-32 px-8 md:px-14 text-center relative overflow-hidden bg-gradient-to-b from-cream via-blush/20 to-rose/10">
      <div className="max-w-2xl mx-auto relative z-10">
        <p className="text-eyebrow text-rose mb-6">Early access</p>
        <h2 className="text-display-lg text-deep mb-8">
          Ready to feel
          <br />
          <em className="italic text-rose">closer?</em>
        </h2>
        <p className="text-xl text-mid/80 mb-14 leading-relaxed font-light">
          p-ink is in early development. Join the waitlist and be first to know
          when frames ship.
        </p>
        <Link
          href="/auth/sign-up"
          className="inline-block btn bg-rose text-white text-lg px-12 py-5 shadow-[0_8px_32px_rgba(212,144,122,0.35)] hover:shadow-[0_16px_48px_rgba(212,144,122,0.4)] hover:bg-deep transition-all duration-300"
        >
          Join the waitlist
        </Link>
      </div>
    </section>
  );
};

const HomeFooter = () => {
  return (
    <footer className="px-8 md:px-14 py-10 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-rose/10 bg-cream">
      <span className="font-display text-2xl font-light text-deep">
        p<em className="italic text-rose">-ink</em>
      </span>
      <span className="text-sm font-light text-muted">
        © {new Date().getFullYear()} p-ink. Made with care for long-distance
        couples.
      </span>
    </footer>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-cream min-h-screen text-ink font-body selection:bg-rose/20 selection:text-deep">
      <HomeNav />
      <HeroSection />
      
      {/* Subtle division */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-blush/50 to-transparent max-w-4xl mx-auto" />
      
      <HowItWorks />
      <FeaturesSection />
      <CtaSection />
      <HomeFooter />
    </main>
  );
}