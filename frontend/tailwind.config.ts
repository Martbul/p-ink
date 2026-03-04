// import type { Config } from "tailwindcss";

// const config: Config = {
//   content: [
//     "./app/**/*.{ts,tsx}",
//     "./components/**/*.{ts,tsx}",
//     "./lib/**/*.{ts,tsx}",
//   ],
// };

// export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Map CSS variable fonts set on <html> via layout.tsx
        display: ["var(--font-display)", "serif"],        // Cormorant Garamond
        syne:    ["var(--font-syne)", "sans-serif"],       // Syne 800
        body:    ["var(--font-body)", "sans-serif"],       // Instrument Sans
        mono:    ["'Space Mono'", "monospace"],            // Space Mono (Google Fonts CDN)
      },
      colors: {
        // ── Brand palette ───────────────────────────────
        "neon-blue":   "#05d9e8",
        "neon-purple": "#b122e5",
        "neon-pink":   "#ff2a6d",
        // ── Surface ─────────────────────────────────────
        "bg-dark":      "#080810",
        "surface":      "#0d0d1a",
        "surface-dark": "#0a0a14",
        // ── Text ────────────────────────────────────────
        "text-muted":   "rgba(255,255,255,0.4)",
        // ── Legacy tokens kept for compatibility ────────
        cream: "#f5f0e8",
        ink:   "#1a1a1a",
        rose:  "#e85d75",
        deep:  "#0d0d1a",
      },
      backgroundImage: {
        "neon-gradient": "linear-gradient(135deg, #05d9e8 0%, #b122e5 55%, #ff2a6d 100%)",
        "scanlines": "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)",
      },
      boxShadow: {
        "neon-cyan":   "0 0 20px rgba(5,217,232,0.4), 0 0 40px rgba(5,217,232,0.2)",
        "neon-purple": "0 0 20px rgba(177,34,229,0.4), 0 0 40px rgba(177,34,229,0.2)",
        "neon-pink":   "0 0 20px rgba(255,42,109,0.4), 0 0 40px rgba(255,42,109,0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow":       "glow 2s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%, 100%": { opacity: "0.7" },
          "50%":      { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;