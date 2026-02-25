import Link from "next/link";

const STEPS = [
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

const FEATURES = [
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    name: "100+ daily prompts",
    desc: "Across categories: deep, funny, nostalgic. Never the same question twice.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
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
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    name: "Midnight fade",
    desc: "Answers fade at midnight in your timezone, creating a gentle daily ritual.",
  },
  {
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    name: "E-ink display",
    desc: "No blue light. Always on. Readable in any light. Calm and beautiful.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-28 px-8 md:px-14 max-w-7xl mx-auto">
      <p className="text-eyebrow mb-4">The experience</p>
      <h2 className="text-display-lg text-deep mb-16">
        Simple by design,
        <br />
        <em className="italic text-terra">meaningful by nature.</em>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {STEPS.map((s) => (
          <div key={s.n} className="card-hover p-8 md:p-10 rounded-2xl">
            <div
              className="font-display text-6xl font-light mb-5"
              style={{ color: "var(--blush)" }}
            >
              {s.n}
            </div>
            <h3 className="font-display text-2xl font-normal text-deep mb-3">
              {s.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-24 px-8 md:px-14"
      style={{ background: "var(--deep)" }}
    >
      <div className="max-w-7xl mx-auto">
        <p className="text-eyebrow mb-4" style={{ color: "var(--blush)" }}>
          What's inside
        </p>
        <h2 className="text-display-lg mb-16" style={{ color: "var(--cream)" }}>
          Built with{" "}
          <em className="italic" style={{ color: "var(--terra)" }}>
            intention.
          </em>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.name} className="flex flex-col gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(184,147,90,0.15)",
                  color: "var(--gold)",
                }}
              >
                {f.icon}
              </div>
              <h3
                className="font-display text-lg font-normal"
                style={{ color: "var(--cream)" }}
              >
                {f.name}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(250,247,242,0.55)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section
      className="py-28 px-8 md:px-14 text-center"
      style={{
        background: "linear-gradient(to bottom, var(--cream), var(--warm))",
      }}
    >
      <p className="text-eyebrow mb-5">Early access</p>
      <h2 className="text-display-lg text-deep mb-6">
        Ready to feel
        <br />
        <em className="italic text-terra">closer?</em>
      </h2>
      <p
        className="text-lg text-mid max-w-md mx-auto mb-12 leading-relaxed"
        style={{ fontWeight: 300 }}
      >
        loveframe is in early development. Join the waitlist and be first to
        know when frames ship.
      </p>
      <Link
        href="/auth/sign-up"
        className="inline-block text-white px-12 py-4 rounded-full text-base transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "var(--terra)",
          boxShadow: "0 8px 32px rgba(196,113,74,0.3)",
          textDecoration: "none",
        }}
      >
        Join the waitlist
      </Link>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="px-8 md:px-14 py-8 flex items-center justify-between border-t border-warm text-sm text-muted">
      <span className="font-display text-lg font-light text-deep">
        love
        <em className="italic" style={{ color: "var(--terra)" }}>
          frame
        </em>
      </span>
      <span>© 2025 loveframe. Made with care for long-distance couples.</span>
    </footer>
  );
}
