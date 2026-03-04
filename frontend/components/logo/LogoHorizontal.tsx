// components/logo/LogoHorizontal.tsx
// Horizontal lockup — icon left, wordmark right. Perfect for navbars.
// Usage: <LogoHorizontal /> or <LogoHorizontal size="sm" />

type LogoSize = "xs" | "sm" | "md" | "lg";

const sizes: Record<LogoSize, { icon: number; text: number; dash: number; gap: number }> = {
  xs: { icon: 20, text: 16, dash: 11, gap: 6  },
  sm: { icon: 28, text: 20, dash: 14, gap: 8  },
  md: { icon: 36, text: 26, dash: 18, gap: 10 },
  lg: { icon: 48, text: 34, dash: 22, gap: 12 },
};

interface LogoHorizontalProps {
  size?: LogoSize;
  className?: string;
}

export function LogoHorizontal({ size = "sm", className }: LogoHorizontalProps) {
  const s = sizes[size];

  return (
    <div
      className={`flex items-center ${className ?? ""}`}
      style={{ gap: s.gap }}
    >
      {/* Icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          flexShrink: 0,
          filter:
            "drop-shadow(0 0 6px rgba(5,217,232,0.5)) drop-shadow(0 0 14px rgba(177,34,229,0.3))",
        }}
      >
        <defs>
          <linearGradient id="lh-frameGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#05d9e8" />
            <stop offset="100%" stopColor="#b122e5" />
          </linearGradient>
          <linearGradient id="lh-heartGrad" x1="30" y1="42" x2="90" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ff2a6d" />
            <stop offset="100%" stopColor="#b122e5" />
          </linearGradient>
        </defs>
        <path d="M18 8 L102 8 L112 18 L112 102 L102 112 L18 112 L8 102 L8 18 Z" stroke="url(#lh-frameGrad)" strokeWidth="2" fill="rgba(5,217,232,0.04)" />
        <line x1="8"   y1="28"  x2="8"   y2="18"  stroke="#05d9e8" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="8"   y1="18"  x2="18"  y2="18"  stroke="#05d9e8" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="102" y1="8"   x2="112" y2="8"   stroke="#b122e5" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="112" y1="8"   x2="112" y2="18"  stroke="#b122e5" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="112" y1="102" x2="112" y2="112" stroke="#05d9e8" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="112" y1="112" x2="102" y2="112" stroke="#05d9e8" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="18"  y1="112" x2="8"   y2="112" stroke="#b122e5" strokeWidth="3.5" strokeLinecap="square" />
        <line x1="8"   y1="112" x2="8"   y2="102" stroke="#b122e5" strokeWidth="3.5" strokeLinecap="square" />
        <path d="M60 82 C60 82 32 65 32 48 C32 39 39 33 47 33 C52 33 56 36 60 40 C64 36 68 33 73 33 C81 33 88 39 88 48 C88 65 60 82 60 82Z" stroke="url(#lh-heartGrad)" strokeWidth="2.5" fill="rgba(255,42,109,0.1)" />
      </svg>

      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: s.text,
          color: "#ffffff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}>p</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: s.dash,
          color: "rgba(255,255,255,0.25)",
          margin: "0 1px",
          lineHeight: 1,
          alignSelf: "center",
        }}>-</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: s.text,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          background: "linear-gradient(135deg, #05d9e8 0%, #b122e5 60%, #ff2a6d 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>ink</span>
      </div>
    </div>
  );
}