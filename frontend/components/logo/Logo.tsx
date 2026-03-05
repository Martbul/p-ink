interface LogoProps {
  showTagline?: boolean;
  markSize?: number;
  className?: string;
}

export function Logo({ showTagline = true, markSize = 80, className }: LogoProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 ${className ?? ""}`}
      style={{ fontFamily: "inherit" }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter:
            "drop-shadow(0 0 12px rgba(5,217,232,0.6)) drop-shadow(0 0 30px rgba(177,34,229,0.4))",
        }}
      >
        <defs>
          <linearGradient id="logo-frameGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#05d9e8" />
            <stop offset="100%" stopColor="#b122e5" />
          </linearGradient>
          <linearGradient id="logo-heartGrad" x1="30" y1="42" x2="90" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ff2a6d" />
            <stop offset="100%" stopColor="#b122e5" />
          </linearGradient>
          <filter id="logo-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="M18 8 L102 8 L112 18 L112 102 L102 112 L18 112 L8 102 L8 18 Z" stroke="url(#logo-frameGrad)" strokeWidth="1.5" fill="rgba(5,217,232,0.03)" />
        <path d="M24 15 L96 15 L105 24 L105 96 L96 105 L24 105 L15 96 L15 24 Z" stroke="url(#logo-frameGrad)" strokeWidth="0.75" strokeOpacity="0.4" fill="none" />
        <g filter="url(#logo-glow)">
          <line x1="8"   y1="30"  x2="8"   y2="18"  stroke="#05d9e8" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="8"   y1="18"  x2="20"  y2="18"  stroke="#05d9e8" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="100" y1="8"   x2="112" y2="8"   stroke="#b122e5" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="112" y1="8"   x2="112" y2="20"  stroke="#b122e5" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="112" y1="100" x2="112" y2="112" stroke="#05d9e8" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="112" y1="112" x2="100" y2="112" stroke="#05d9e8" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="20"  y1="112" x2="8"   y2="112" stroke="#b122e5" strokeWidth="2.5" strokeLinecap="square" />
          <line x1="8"   y1="112" x2="8"   y2="100" stroke="#b122e5" strokeWidth="2.5" strokeLinecap="square" />
        </g>
        <circle cx="18"  cy="18"  r="2.5" fill="#05d9e8" />
        <circle cx="102" cy="18"  r="2.5" fill="#b122e5" />
        <circle cx="102" cy="102" r="2.5" fill="#05d9e8" />
        <circle cx="18"  cy="102" r="2.5" fill="#b122e5" />
        <path d="M60 82 C60 82 32 65 32 48 C32 39 39 33 47 33 C52 33 56 36 60 40 C64 36 68 33 73 33 C81 33 88 39 88 48 C88 65 60 82 60 82Z" fill="rgba(255,42,109,0.12)" />
        <path d="M60 82 C60 82 32 65 32 48 C32 39 39 33 47 33 C52 33 56 36 60 40 C64 36 68 33 73 33 C81 33 88 39 88 48 C88 65 60 82 60 82Z" stroke="url(#logo-heartGrad)" strokeWidth="2" fill="none" filter="url(#logo-glow)" />
        <rect x="20" y="94" width="3" height="3" rx="0.5" fill="#05d9e8" opacity="0.5" />
        <rect x="26" y="94" width="3" height="3" rx="0.5" fill="#b122e5" opacity="0.5" />
        <rect x="32" y="94" width="3" height="3" rx="0.5" fill="#05d9e8" opacity="0.5" />
      </svg>

      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 48,
          color: "#ffffff",
          letterSpacing: "-2px",
          lineHeight: 1,
          textShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 60px rgba(5,217,232,0.2)",
        }}>p</span>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 32,
          color: "rgba(255,255,255,0.25)",
          margin: "0 1px",
          lineHeight: 1,
          alignSelf: "center",
        }}>-</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: 48,
          letterSpacing: "-2px",
          lineHeight: 1,
          background: "linear-gradient(135deg, #05d9e8 0%, #b122e5 60%, #ff2a6d 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 20px rgba(5,217,232,0.4))",
        }}>ink</span>
      </div>

      {/* Tagline */}
      {showTagline && (
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
        }}>
          distance&nbsp;/&nbsp;<span style={{ color: "rgba(5,217,232,0.7)" }}>dissolved</span>
        </div>
      )}
    </div>
  );
}