// components/logo/LogoMono.tsx
// Monochrome white version — for light backgrounds, print, embossing, etc.
// Usage: <LogoMono size={48} color="#000000" />

interface LogoMonoProps {
  size?: number;
  color?: string;   // default white — pass "#000" for black version
  className?: string;
}

export function LogoMono({ size = 48, color = "#ffffff", className }: LogoMonoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Frame */}
      <path
        d="M18 8 L102 8 L112 18 L112 102 L102 112 L18 112 L8 102 L8 18 Z"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeOpacity="0.9"
      />

      {/* Inner frame */}
      <path
        d="M24 15 L96 15 L105 24 L105 96 L96 105 L24 105 L15 96 L15 24 Z"
        stroke={color}
        strokeWidth="0.75"
        strokeOpacity="0.3"
        fill="none"
      />

      {/* Corner brackets */}
      <line x1="8"   y1="30"  x2="8"   y2="18"  stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="8"   y1="18"  x2="20"  y2="18"  stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="100" y1="8"   x2="112" y2="8"   stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="112" y1="8"   x2="112" y2="20"  stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="112" y1="100" x2="112" y2="112" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="112" y1="112" x2="100" y2="112" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="20"  y1="112" x2="8"   y2="112" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
      <line x1="8"   y1="112" x2="8"   y2="100" stroke={color} strokeWidth="2.5" strokeLinecap="square" />

      {/* Corner dots */}
      <circle cx="18"  cy="18"  r="2.5" fill={color} />
      <circle cx="102" cy="18"  r="2.5" fill={color} />
      <circle cx="102" cy="102" r="2.5" fill={color} />
      <circle cx="18"  cy="102" r="2.5" fill={color} />

      {/* Heart */}
      <path
        d="M60 82 C60 82 32 65 32 48 C32 39 39 33 47 33 C52 33 56 36 60 40 C64 36 68 33 73 33 C81 33 88 39 88 48 C88 65 60 82 60 82Z"
        stroke={color}
        strokeWidth="2.5"
        fill="none"
        strokeOpacity="0.9"
      />

      {/* Data dots */}
      <rect x="20" y="94" width="3" height="3" rx="0.5" fill={color} opacity="0.4" />
      <rect x="26" y="94" width="3" height="3" rx="0.5" fill={color} opacity="0.4" />
      <rect x="32" y="94" width="3" height="3" rx="0.5" fill={color} opacity="0.4" />
    </svg>
  );
}