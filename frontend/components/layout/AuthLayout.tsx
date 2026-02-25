import Link from "next/link";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";

interface AuthLayoutProps {
  children: React.ReactNode;
  quote?: string;
  quoteAttr?: string;
  showFrame?: boolean;
}

export function AuthLayout({
  children,
  quote = "Distance means so little when someone means so much.",
  quoteAttr = "— Tom McNeal",
  showFrame = false,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — dark decorative panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-16 overflow-hidden"
        style={{ background: "var(--deep)" }}
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 30% 60%, rgba(196,113,74,0.14) 0%, transparent 70%)",
          }}
        />

        <Link
          href="/"
          className="relative font-display text-2xl font-light text-cream"
        >
          love
          <em className="italic" style={{ color: "var(--terra)" }}>
            frame
          </em>
        </Link>

        <div className="relative">
          {showFrame ? (
            <FrameMiniMockup size="lg" />
          ) : (
            <>
              <p
                className="font-display text-4xl font-light italic leading-snug mb-4"
                style={{ color: "var(--cream)", opacity: 0.9 }}
              >
                "{quote}"
              </p>
              <p
                className="text-sm tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                {quoteAttr}
              </p>
            </>
          )}
        </div>

        <p
          className="relative text-xs tracking-widest uppercase"
          style={{ color: "var(--muted)" }}
        >
          © 2025 loveframe
        </p>
      </div>

      {/* Right — form panel */}
      <div className="flex items-center justify-center px-8 py-16 bg-cream">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
