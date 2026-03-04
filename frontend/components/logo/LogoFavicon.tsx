// public/favicon.svg  — drop this in /public and reference in app/layout.tsx:
// <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
//
// Also works as a React component if you need it inline:
// import FaviconSvg from "@/public/favicon.svg"  (with @svgr/webpack)

// ── As a static SVG file, paste the markup below into /public/favicon.svg ──

/*
<svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="4" width="112" height="112" rx="16" fill="#080810"/>
  <path d="M22 8 L98 8 L112 22 L112 98 L98 112 L22 112 L8 98 L8 22 Z" stroke="url(#fv-frame)" stroke-width="2.5" fill="rgba(5,217,232,0.05)"/>
  <line x1="8" y1="32" x2="8" y2="22" stroke="#05d9e8" stroke-width="4" stroke-linecap="square"/>
  <line x1="8" y1="22" x2="18" y2="22" stroke="#05d9e8" stroke-width="4" stroke-linecap="square"/>
  <line x1="102" y1="8" x2="112" y2="8" stroke="#b122e5" stroke-width="4" stroke-linecap="square"/>
  <line x1="112" y1="8" x2="112" y2="18" stroke="#b122e5" stroke-width="4" stroke-linecap="square"/>
  <line x1="112" y1="102" x2="112" y2="112" stroke="#05d9e8" stroke-width="4" stroke-linecap="square"/>
  <line x1="112" y1="112" x2="102" y2="112" stroke="#05d9e8" stroke-width="4" stroke-linecap="square"/>
  <line x1="18" y1="112" x2="8" y2="112" stroke="#b122e5" stroke-width="4" stroke-linecap="square"/>
  <line x1="8" y1="112" x2="8" y2="102" stroke="#b122e5" stroke-width="4" stroke-linecap="square"/>
  <path d="M60 84 C60 84 30 66 30 48 C30 38 37 31 46 31 C51 31 56 34 60 39 C64 34 69 31 74 31 C83 31 90 38 90 48 C90 66 60 84 60 84Z" stroke="url(#fv-heart)" stroke-width="3" fill="rgba(255,42,109,0.15)"/>
  <defs>
    <linearGradient id="fv-frame" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#05d9e8"/>
      <stop offset="100%" stop-color="#b122e5"/>
    </linearGradient>
    <linearGradient id="fv-heart" x1="30" y1="42" x2="90" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff2a6d"/>
      <stop offset="100%" stop-color="#b122e5"/>
    </linearGradient>
  </defs>
</svg>
*/

// ── As a React component (e.g. for og-image or dynamic use) ──────────────────

export function LogoFavicon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fv-frameGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#05d9e8" />
          <stop offset="100%" stopColor="#b122e5" />
        </linearGradient>
        <linearGradient id="fv-heartGrad" x1="30" y1="42" x2="90" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ff2a6d" />
          <stop offset="100%" stopColor="#b122e5" />
        </linearGradient>
      </defs>

      {/* Dark background pill */}
      <rect x="2" y="2" width="116" height="116" rx="18" fill="#080810" />

      {/* Frame */}
      <path
        d="M22 8 L98 8 L112 22 L112 98 L98 112 L22 112 L8 98 L8 22 Z"
        stroke="url(#fv-frameGrad)"
        strokeWidth="2.5"
        fill="rgba(5,217,232,0.05)"
      />

      {/* Corner brackets */}
      <line x1="8"   y1="32"  x2="8"   y2="22"  stroke="#05d9e8" strokeWidth="4" strokeLinecap="square" />
      <line x1="8"   y1="22"  x2="18"  y2="22"  stroke="#05d9e8" strokeWidth="4" strokeLinecap="square" />
      <line x1="102" y1="8"   x2="112" y2="8"   stroke="#b122e5" strokeWidth="4" strokeLinecap="square" />
      <line x1="112" y1="8"   x2="112" y2="18"  stroke="#b122e5" strokeWidth="4" strokeLinecap="square" />
      <line x1="112" y1="102" x2="112" y2="112" stroke="#05d9e8" strokeWidth="4" strokeLinecap="square" />
      <line x1="112" y1="112" x2="102" y2="112" stroke="#05d9e8" strokeWidth="4" strokeLinecap="square" />
      <line x1="18"  y1="112" x2="8"   y2="112" stroke="#b122e5" strokeWidth="4" strokeLinecap="square" />
      <line x1="8"   y1="112" x2="8"   y2="102" stroke="#b122e5" strokeWidth="4" strokeLinecap="square" />

      {/* Heart */}
      <path
        d="M60 84 C60 84 30 66 30 48 C30 38 37 31 46 31 C51 31 56 34 60 39 C64 34 69 31 74 31 C83 31 90 38 90 48 C90 66 60 84 60 84Z"
        stroke="url(#fv-heartGrad)"
        strokeWidth="3"
        fill="rgba(255,42,109,0.15)"
      />
    </svg>
  );
}