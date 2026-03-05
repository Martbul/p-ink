import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// PIXEL ART ENGINE
// Each sprite is a 2D array of color indices
// 0 = transparent, colors defined per character
// ═══════════════════════════════════════════════════════════════

const SCALE = 4; // each pixel = 4x4 px on screen

function PixelSprite({ pixels, palette, scale = SCALE, style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const h = pixels.length;
    const w = pixels[0].length;
    canvas.width = w * scale;
    canvas.height = h * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = pixels[y][x];
        if (idx === 0) continue;
        ctx.fillStyle = palette[idx];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [pixels, palette, scale]);

  return <canvas ref={canvasRef} style={{ imageRendering: "pixelated", ...style }} />;
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// ── SPECTER (Ghost) ──────────────────────────────────────────
const SPECTER_PALETTE = {
  1: "#b5c8ff", // body light
  2: "#8aa4f0", // body mid
  3: "#6680d4", // body dark / outline
  4: "#ffffff", // eye white
  5: "#2a2870", // eye pupil
  6: "#ff9de2", // blush
  7: "#c0d0ff", // body highlight
  8: "#4455bb", // shadow
  9: "#ffde7a", // glow accent
  A: "#ff6b9d", // mouth
};

const SPECTER_IDLE = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,1,4,5,4,5,1,1,3],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,6,1,1,1,1,6,1,3],
  [3,1,1,1,A,1,A,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,2,1,2,1,2,1,2,1,3],
  [0,3,3,0,3,3,0,3,3,0],
].map(r => r.map(v => v === "A" ? 10 : v));

const SPECTER_PALETTE_FIXED = { ...SPECTER_PALETTE, 10: "#ff6b9d" };

const SPECTER_HAPPY = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,1,5,5,5,5,1,1,3],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,6,1,1,1,1,6,1,3],
  [3,1,1,3,3,3,3,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,2,1,2,1,2,1,2,1,3],
  [0,3,3,0,3,3,0,3,3,0],
];

const SPECTER_SAD = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,5,4,5,4,1,1,3],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,1,5,4,5,4,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,1,1,3,3,1,1,1,3],
  [3,1,1,3,1,1,3,1,1,3],
  [3,2,1,2,1,2,1,2,1,3],
  [0,3,3,0,3,3,0,3,3,0],
];

const SPECTER_SLEEP = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,3,3,3,3,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,2,2,1,1,2,2,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,1,9,9,9,1,1,1,3],
  [3,2,1,2,1,2,1,2,1,3],
  [0,3,3,0,3,3,0,3,3,0],
];

// ── BLOBBY (Slime) ──────────────────────────────────────────
const BLOBBY_PALETTE = {
  1: "#7effa0", // body light
  2: "#4cd472", // body mid
  3: "#2a9e4f", // outline
  4: "#ffffff", // eye white
  5: "#1a3a1a", // pupil
  6: "#ff9de2", // blush
  7: "#b8ffe0", // highlight
  8: "#1a7a38", // shadow
  9: "#fff48a", // shine
  10: "#ff6b6b", // mouth
};

const BLOBBY_IDLE = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,7,1,1,1,1,1,1,7,3],
  [3,1,1,4,2,2,4,1,1,3],
  [3,1,1,4,5,2,5,1,1,3],
  [3,1,6,4,2,2,4,6,1,3],
  [3,1,1,1,10,1,10,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];

const BLOBBY_HAPPY = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,7,1,1,1,1,1,1,7,3],
  [3,1,1,2,2,2,2,1,1,3],
  [3,1,1,5,5,5,5,1,1,3],
  [3,1,6,2,2,2,2,6,1,3],
  [3,1,1,3,3,3,3,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];

const BLOBBY_SAD = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,7,1,1,1,1,1,1,7,3],
  [3,1,1,5,4,4,5,1,1,3],
  [3,1,1,4,2,2,4,1,1,3],
  [3,1,1,5,4,4,5,1,1,3],
  [3,1,1,1,3,1,3,1,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];

// ── SPARKY (Robot) ──────────────────────────────────────────
const SPARKY_PALETTE = {
  1: "#d0e8ff", // chrome light
  2: "#8ab8e0", // chrome mid
  3: "#3a6080", // outline/dark
  4: "#ff4444", // eye red
  5: "#ffff00", // eye glow
  6: "#60c0ff", // screen blue
  7: "#ffffff", // shine
  8: "#1a3040", // deep shadow
  9: "#ff9900", // antenna tip
  10: "#22ff88", // visor green
};

const SPARKY_IDLE = [
  [0,0,9,0,0,0,0,9,0,0],
  [0,0,3,0,0,0,0,3,0,0],
  [0,3,3,3,3,3,3,3,3,0],
  [0,3,7,2,1,1,2,7,1,3],
  [0,3,1,6,4,4,6,1,3,0],
  [0,3,1,6,5,5,6,1,3,0],
  [0,3,2,6,4,4,6,2,3,0],
  [3,3,1,1,1,1,1,1,3,3],
  [3,2,3,1,10,10,1,3,2,3],
  [0,3,3,3,3,3,3,3,3,0],
  [0,0,3,1,0,0,1,3,0,0],
];

const SPARKY_HAPPY = [
  [0,0,9,0,0,0,0,9,0,0],
  [0,0,3,0,0,0,0,3,0,0],
  [0,3,3,3,3,3,3,3,3,0],
  [0,3,7,2,1,1,2,7,1,3],
  [0,3,1,5,5,5,5,1,3,0],
  [0,3,1,6,4,4,6,1,3,0],
  [0,3,2,6,4,4,6,2,3,0],
  [3,3,1,1,1,1,1,1,3,3],
  [3,2,3,3,10,10,3,3,2,3],
  [0,3,3,3,3,3,3,3,3,0],
  [0,0,3,1,0,0,1,3,0,0],
];

// ── FLUFFY (Cloud cat) ──────────────────────────────────────
const FLUFFY_PALETTE = {
  1: "#fff5e0", // body cream
  2: "#f0d8b0", // body warm
  3: "#a08060", // outline
  4: "#ffffff", // eye white
  5: "#2a1a0a", // pupil
  6: "#ff9de2", // blush + nose
  7: "#fff8f0", // highlight
  8: "#c8a878", // shadow
  9: "#ffcc88", // ear inner
  10: "#ff7aa8", // mouth
};

const FLUFFY_IDLE = [
  [0,9,0,3,3,3,3,0,9,0],
  [0,9,3,1,1,1,1,3,9,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,4,2,2,4,1,1,3],
  [3,1,1,4,5,2,5,1,1,3],
  [3,1,6,4,2,2,4,6,1,3],
  [3,1,1,1,6,10,1,1,1,3],
  [3,1,2,1,1,1,1,2,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,0,0,3,3,3,3,0,0,0],
];

const FLUFFY_HAPPY = [
  [0,9,0,3,3,3,3,0,9,0],
  [0,9,3,1,1,1,1,3,9,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,2,2,2,2,1,1,3],
  [3,1,1,5,5,5,5,1,1,3],
  [3,1,6,2,2,2,2,6,1,3],
  [3,1,1,3,3,3,3,1,1,3],
  [3,1,2,1,1,1,1,2,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,0,0,3,3,3,3,0,0,0],
];

// ═══════════════════════════════════════════════════════════════
// PIXEL ART BACKGROUNDS (16x10 tiles)
// ═══════════════════════════════════════════════════════════════

function PixelBackground({ type, scale = 3 }) {
  const canvasRef = useRef(null);

  const backgrounds = {
    night_city: {
      palette: {
        1: "#080614", 2: "#13102b", 3: "#1f1a45", 4: "#2a2560",
        5: "#ff2a6d", 6: "#05d9e8", 7: "#b122e5", 8: "#ffde7a",
        9: "#ffffff", A: "#0d0a24", B: "#060410", C: "#3a2e80",
        D: "#ff9de2", E: "#1a1535",
      },
      // 20 wide x 14 tall
      pixels: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,9,1,1,1,1,9,1,1,1,1,9,1,1,1,1],
        [1,1,8,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,9,1,1,1,1,1,1,1,1,1,8,1,1],
        [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
        [A,4,A,A,5,A,A,A,6,A,A,7,A,A,5,A,A,6,A,A],
        [A,4,5,A,5,A,3,A,6,A,3,7,3,A,5,A,6,A,6,A],
        [A,4,5,A,5,3,3,A,6,3,3,7,3,A,5,3,6,3,6,A],
        [E,4,5,E,5,3,3,E,6,3,3,7,3,E,5,3,6,3,6,E],
        [E,C,C,E,C,C,C,E,C,C,C,C,C,E,C,C,C,C,C,E],
        [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        [2,5,2,2,2,6,2,2,2,7,2,2,2,5,2,2,2,6,2,2],
        [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
        [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
      ],
    },
    bedroom: {
      palette: {
        1: "#2a1f3a", 2: "#3d2e55", 3: "#5a3f6e", 4: "#f0d0b0",
        5: "#c09070", 6: "#7858a0", 7: "#ff9de2", 8: "#90c8e0",
        9: "#ffde7a", A: "#4a3560", B: "#d080a0", C: "#f8f0e8",
        D: "#6a4880", E: "#e8c0a0",
      },
      pixels: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,9,1,1,1,1,1,1,1,9,1,1,1,1,1,1,9,1,1,1],
        [1,1,1,1,2,2,2,2,1,1,1,1,1,2,2,2,2,1,1,1],
        [1,1,1,2,8,8,8,8,2,1,1,1,2,8,8,8,8,2,1,1],
        [1,1,1,2,8,9,8,8,2,1,1,1,2,8,8,9,8,2,1,1],
        [1,1,1,2,8,8,8,8,2,1,1,1,2,8,8,8,8,2,1,1],
        [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
        [A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A],
        [4,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,4],
        [4,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,4],
        [4,C,7,C,C,C,C,B,C,C,C,C,C,7,C,C,C,B,C,4],
        [4,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,4],
        [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
        [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
      ],
    },
    pixel_park: {
      palette: {
        1: "#87ceeb", 2: "#b8e4f7", 3: "#5aa8d8", 4: "#78d478",
        5: "#4ea84e", 6: "#2a7a2a", 7: "#ffffff", 8: "#e8e8e8",
        9: "#ffde7a", A: "#c8a040", B: "#8b6914", C: "#f0f0f0",
        D: "#a0d870", E: "#6ac060",
      },
      pixels: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,7,7,1,1,1,1,7,7,7,1,1,1,1,1,7,7,1,1,1],
        [1,7,7,7,1,1,7,7,7,7,7,1,1,1,7,7,7,7,1,1],
        [1,1,7,1,1,1,1,7,1,7,1,1,1,1,1,7,1,1,1,1],
        [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
        [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
        [4,4,5,4,4,4,4,4,5,5,4,4,4,4,5,4,4,4,4,4],
        [D,4,E,4,D,4,4,D,E,E,D,4,4,D,E,4,4,4,D,4],
        [6,5,6,5,6,5,5,6,5,6,5,5,6,5,6,5,5,6,5,6],
        [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
        [A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A],
        [8,8,8,C,8,8,8,8,8,C,8,8,8,8,8,C,8,8,8,8],
        [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
        [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8],
      ],
    },
    space: {
      palette: {
        1: "#020210", 2: "#050520", 3: "#0a0830", 4: "#ffffff",
        5: "#b8d0ff", 6: "#ff9de2", 7: "#b122e5", 8: "#05d9e8",
        9: "#ffd700", A: "#ff6b6b", B: "#80c0ff", C: "#1a1040",
        D: "#ff4488", E: "#3a0060",
      },
      pixels: [
        [1,1,1,4,1,1,1,1,5,1,1,1,1,4,1,1,1,5,1,1],
        [1,4,1,1,1,5,1,1,1,1,4,1,1,1,1,1,1,1,4,1],
        [1,1,1,1,1,1,1,4,1,1,1,1,5,1,4,1,1,1,1,1],
        [5,1,1,1,7,7,1,1,1,1,1,1,1,1,1,1,5,1,1,1],
        [1,1,1,7,D,D,7,1,1,1,1,4,1,1,1,1,1,1,4,1],
        [1,4,1,7,D,7,1,1,1,1,1,1,1,5,1,1,1,1,1,1],
        [1,1,1,1,7,1,1,1,4,1,1,1,1,1,1,4,1,1,5,1],
        [1,1,4,1,1,1,1,1,1,1,9,9,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,5,1,1,1,9,A,A,9,1,1,1,4,1,1,1],
        [5,1,1,1,1,1,1,1,1,9,A,9,1,1,1,1,1,1,1,5],
        [1,1,1,4,1,1,1,1,8,8,8,8,8,8,1,1,1,4,1,1],
        [1,4,1,1,1,1,1,8,B,B,B,B,B,B,8,1,1,1,1,1],
        [1,1,1,5,1,1,1,8,B,8,8,B,B,B,8,1,1,5,1,1],
        [1,1,4,1,1,4,1,1,8,8,8,8,8,8,1,1,1,1,4,1],
      ],
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const bg = backgrounds[type];
    if (!bg) return;
    const h = bg.pixels.length;
    const w = bg.pixels[0].length;
    canvas.width = w * scale;
    canvas.height = h * scale;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const key = bg.pixels[y][x];
        const color = bg.palette[key];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [type, scale]);

  return <canvas ref={canvasRef} style={{ imageRendering: "pixelated", display: "block" }} />;
}

// ═══════════════════════════════════════════════════════════════
// ANIMATED SPRITE COMPONENT
// ═══════════════════════════════════════════════════════════════

function AnimatedSprite({ frames, palette, scale = SCALE, fps = 4, style = {} }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [frames.length, fps]);

  return <PixelSprite pixels={frames[frame]} palette={palette} scale={scale} style={style} />;
}

// ── Walk animation frames for SPECTER ──
const SPECTER_WALK_1 = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,1,4,5,4,5,1,1,3],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,6,1,1,1,1,6,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,1,1,1,1,1,1,1,2,3],
  [3,2,1,2,1,2,1,3,0,0],
  [0,3,3,0,3,3,0,0,0,0],
];

const SPECTER_WALK_2 = [
  [0,0,0,3,3,3,3,0,0,0],
  [0,0,3,1,1,1,1,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,1,4,5,4,5,1,1,3],
  [3,1,1,4,2,4,2,1,1,3],
  [3,1,6,1,1,1,1,6,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [3,2,1,1,1,1,1,1,1,3],
  [0,0,3,2,1,2,1,2,1,3],
  [0,0,0,0,3,3,0,3,3,0],
];

// ── Blobby bounce frames ──
const BLOBBY_BOUNCE_1 = [
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,7,1,1,1,1,1,1,7,3],
  [3,1,1,4,2,2,4,1,1,3],
  [3,1,1,4,5,2,5,1,1,3],
  [3,1,6,4,2,2,4,6,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

const BLOBBY_BOUNCE_2 = [
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,3,3,3,3,3,3,0,0],
  [0,3,7,1,1,1,1,7,3,0],
  [3,7,1,1,1,1,1,1,7,3],
  [3,1,1,4,2,2,4,1,1,3],
  [3,1,1,4,5,2,5,1,1,3],
  [3,1,6,4,2,2,4,6,1,3],
  [3,1,1,1,1,1,1,1,1,3],
  [0,3,1,1,8,8,1,1,3,0],
  [0,0,3,3,3,3,3,3,0,0],
];

// ── Sparky blink frames ──
const SPARKY_BLINK = [
  [0,0,9,0,0,0,0,9,0,0],
  [0,0,3,0,0,0,0,3,0,0],
  [0,3,3,3,3,3,3,3,3,0],
  [0,3,7,2,1,1,2,7,1,3],
  [0,3,1,3,3,3,3,1,3,0],
  [0,3,1,6,5,5,6,1,3,0],
  [0,3,2,6,4,4,6,2,3,0],
  [3,3,1,1,1,1,1,1,3,3],
  [3,2,3,1,10,10,1,3,2,3],
  [0,3,3,3,3,3,3,3,3,0],
  [0,0,3,1,0,0,1,3,0,0],
];

// ═══════════════════════════════════════════════════════════════
// PARTICLE EFFECTS (pixel art hearts, stars, zzzs)
// ═══════════════════════════════════════════════════════════════

const HEART_SPRITE = {
  palette: { 1: "#ff2a6d", 2: "#ff8ab0", 3: "#cc1050" },
  pixels: [
    [0,1,1,0,1,1,0],
    [1,2,1,1,1,2,1],
    [1,1,1,1,1,1,1],
    [0,1,1,1,1,1,0],
    [0,0,1,1,1,0,0],
    [0,0,0,1,0,0,0],
  ]
};

const STAR_SPRITE = {
  palette: { 1: "#ffde7a", 2: "#ffc030", 3: "#ffffff" },
  pixels: [
    [0,0,3,0,0],
    [0,1,1,1,0],
    [3,1,2,1,3],
    [0,1,1,1,0],
    [0,0,3,0,0],
  ]
};

const ZZZ_SPRITE = {
  palette: { 1: "#b5c8ff", 2: "#8aa4f0" },
  pixels: [
    [1,1,1,0,0],
    [0,0,2,0,0],
    [0,1,0,0,0],
    [1,1,1,0,0],
    [0,0,0,1,1],
    [0,0,0,2,0],
    [0,0,0,1,1],
  ]
};

// ─── Floating particle ────────────────────────────────────────
function FloatingParticle({ sprite, delay = 0, left = "50%", scale = 2 }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: "100%",
        animation: `floatUp 2s ease-out ${delay}s both`,
        pointerEvents: "none",
      }}
    >
      <PixelSprite pixels={sprite.pixels} palette={sprite.palette} scale={scale} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAMAGOTCHI SCENE COMPONENT
// Combines background + character + particles + stats
// ═══════════════════════════════════════════════════════════════

function TamagotchiScene({ character, background, mood, animate = true }) {
  const [particles, setParticles] = useState([]);
  const [frame, setFrame] = useState(0);

  const characters = {
    specter: {
      idle: [SPECTER_IDLE, SPECTER_WALK_1, SPECTER_WALK_2, SPECTER_IDLE],
      happy: [SPECTER_HAPPY, SPECTER_WALK_1, SPECTER_HAPPY, SPECTER_WALK_2],
      sad: [SPECTER_SAD],
      sleep: [SPECTER_SLEEP],
      palette: SPECTER_PALETTE_FIXED,
      name: "Specter",
      emoji: "👻",
    },
    blobby: {
      idle: [BLOBBY_IDLE, BLOBBY_BOUNCE_1, BLOBBY_BOUNCE_2, BLOBBY_IDLE],
      happy: [BLOBBY_HAPPY, BLOBBY_BOUNCE_1, BLOBBY_HAPPY, BLOBBY_BOUNCE_2],
      sad: [BLOBBY_SAD],
      sleep: [BLOBBY_IDLE],
      palette: BLOBBY_PALETTE,
      name: "Blobby",
      emoji: "💚",
    },
    sparky: {
      idle: [SPARKY_IDLE, SPARKY_BLINK, SPARKY_IDLE, SPARKY_IDLE],
      happy: [SPARKY_HAPPY, SPARKY_HAPPY, SPARKY_BLINK, SPARKY_HAPPY],
      sad: [SPARKY_IDLE],
      sleep: [SPARKY_BLINK],
      palette: SPARKY_PALETTE,
      name: "Sparky",
      emoji: "🤖",
    },
    fluffy: {
      idle: [FLUFFY_IDLE, FLUFFY_HAPPY, FLUFFY_IDLE, FLUFFY_IDLE],
      happy: [FLUFFY_HAPPY, FLUFFY_IDLE, FLUFFY_HAPPY, FLUFFY_HAPPY],
      sad: [FLUFFY_IDLE],
      sleep: [FLUFFY_IDLE],
      palette: FLUFFY_PALETTE,
      name: "Fluffy",
      emoji: "🐱",
    },
  };

  const char = characters[character] || characters.specter;
  const frames = char[mood] || char.idle;

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 400);
    return () => clearInterval(id);
  }, [frames.length, animate]);

  const moodParticle = mood === "happy" ? HEART_SPRITE : mood === "sleep" ? ZZZ_SPRITE : STAR_SPRITE;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Pixel background */}
      <PixelBackground type={background} scale={3} />

      {/* Character centered at bottom third */}
      <div style={{
        position: "absolute",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        imageRendering: "pixelated",
      }}>
        <PixelSprite pixels={frames[frame]} palette={char.palette} scale={4} />
      </div>

      {/* Particles */}
      {mood === "happy" && (
        <>
          <FloatingParticle sprite={moodParticle} left="35%" delay={0} scale={2} />
          <FloatingParticle sprite={moodParticle} left="60%" delay={0.5} scale={2} />
          <FloatingParticle sprite={moodParticle} left="45%" delay={1} scale={2} />
        </>
      )}
      {mood === "sleep" && (
        <>
          <FloatingParticle sprite={ZZZ_SPRITE} left="60%" delay={0} scale={2} />
          <FloatingParticle sprite={ZZZ_SPRITE} left="70%" delay={1} scale={2.5} />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS BAR (pixel art style)
// ═══════════════════════════════════════════════════════════════

function PixelStatBar({ label, value, color, maxWidth = 80 }) {
  const filledW = Math.round((value / 100) * maxWidth);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", width: 56, letterSpacing: "0.1em" }}>
        {label}
      </span>
      <div style={{ position: "relative", width: maxWidth, height: 8, background: "rgba(255,255,255,0.06)", imageRendering: "pixelated" }}>
        {/* Segmented bar */}
        {Array.from({ length: Math.floor(maxWidth / 5) }).map((_, i) => {
          const filled = i * 5 < filledW;
          return (
            <div key={i} style={{
              position: "absolute", left: i * 5 + 1, top: 1,
              width: 3, height: 6,
              background: filled ? color : "rgba(255,255,255,0.08)",
              boxShadow: filled ? `0 0 4px ${color}80` : "none",
            }} />
          );
        })}
      </div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: "rgba(255,255,255,0.25)", width: 24 }}>
        {value}%
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTION BUTTON (pixel art style)
// ═══════════════════════════════════════════════════════════════

function PixelButton({ label, icon, color, onClick, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: "6px 10px",
        fontFamily: "'Space Mono', monospace",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: active || hovered ? "#080614" : color,
        background: active || hovered ? color : "transparent",
        border: `2px solid ${color}`,
        cursor: "pointer",
        transition: "all 0.1s",
        imageRendering: "pixelated",
        // pixel art corners
        clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)",
        boxShadow: (active || hovered) ? `0 0 12px ${color}60` : "none",
      }}
    >
      <span style={{ marginRight: 4 }}>{icon}</span>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SHOWCASE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function TamagotchiAssets() {
  const [activeChar, setActiveChar] = useState("specter");
  const [activeBg, setActiveBg] = useState("night_city");
  const [activeMood, setActiveMood] = useState("idle");
  const [stats, setStats] = useState({ mood: 72, hunger: 45, energy: 85, love: 90 });

  const characters = [
    { id: "specter", name: "Specter", emoji: "👻", color: "#b5c8ff" },
    { id: "blobby",  name: "Blobby",  emoji: "💚", color: "#7effa0" },
    { id: "sparky",  name: "Sparky",  emoji: "🤖", color: "#05d9e8" },
    { id: "fluffy",  name: "Fluffy",  emoji: "🐱", color: "#fff5e0" },
  ];

  const backgrounds = [
    { id: "night_city", name: "Night City", icon: "🌆" },
    { id: "bedroom",    name: "Bedroom",    icon: "🌙" },
    { id: "pixel_park", name: "Pixel Park", icon: "🌿" },
    { id: "space",      name: "Space",      icon: "🚀" },
  ];

  const moods = [
    { id: "idle",  label: "Idle",  icon: "😐", color: "#05d9e8" },
    { id: "happy", label: "Happy", icon: "😄", color: "#ffde7a" },
    { id: "sad",   label: "Sad",   icon: "😢", color: "#8aa4f0" },
    { id: "sleep", label: "Sleep", icon: "💤", color: "#b122e5" },
  ];

  function feed()  { setStats(s => ({ ...s, hunger: Math.min(100, s.hunger + 20), mood: Math.min(100, s.mood + 5) })); setActiveMood("happy"); setTimeout(() => setActiveMood("idle"), 2000); }
  function play()  { setStats(s => ({ ...s, mood: Math.min(100, s.mood + 15), energy: Math.max(0, s.energy - 10), love: Math.min(100, s.love + 10) })); setActiveMood("happy"); setTimeout(() => setActiveMood("idle"), 2000); }
  function sleep_() { setStats(s => ({ ...s, energy: Math.min(100, s.energy + 30) })); setActiveMood("sleep"); setTimeout(() => setActiveMood("idle"), 3000); }

  const charColor = characters.find(c => c.id === activeChar)?.color || "#b5c8ff";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07070f",
      color: "#e0e6ed",
      fontFamily: "'Space Mono', monospace",
      padding: "32px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.6); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(177,34,229,0.3); }
          50%       { box-shadow: 0 0 24px rgba(177,34,229,0.7), 0 0 48px rgba(5,217,232,0.2); }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <p style={{ fontFamily: "'Space Mono'", fontSize: 10, letterSpacing: "0.4em", color: "#ff2a6d", textTransform: "uppercase", marginBottom: 8 }}>
          ▸ p-ink companion system
        </p>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: -1, margin: 0, lineHeight: 1 }}>
          Pixel <span style={{ background: "linear-gradient(135deg, #05d9e8, #b122e5, #ff2a6d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Companions</span>
        </h1>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", marginTop: 8 }}>
          ASSET LIBRARY v1.0 // 4 CHARACTERS // 4 BACKGROUNDS // ANIMATED
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>

        {/* LEFT: Main scene viewer */}
        <div>
          {/* Scene display */}
          <div style={{
            position: "relative",
            background: "#0a0a18",
            border: "2px solid rgba(255,255,255,0.08)",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            minHeight: 280,
            imageRendering: "pixelated",
            animation: "glow-pulse 4s ease-in-out infinite",
          }}>
            {/* Corner decorations */}
            {[["top:0;left:0", "top:0;left:0;width:16px;height:2px", "top:0;left:0;width:2px;height:16px"],
              ["top:0;right:0", "top:0;right:0;width:16px;height:2px", "top:0;right:0;width:2px;height:16px"],
              ["bottom:0;left:0", "bottom:0;left:0;width:16px;height:2px", "bottom:0;left:0;width:2px;height:16px"],
              ["bottom:0;right:0", "bottom:0;right:0;width:16px;height:2px", "bottom:0;right:0;width:2px;height:16px"],
            ].map(([_, h, v], i) => (
              <div key={i} style={{ position: "absolute" }}>
                <div style={{ position: "absolute", ...Object.fromEntries(h.split(";").map(s => s.split(":"))), background: charColor, opacity: 0.8 }} />
                <div style={{ position: "absolute", ...Object.fromEntries(v.split(";").map(s => s.split(":"))), background: charColor, opacity: 0.8 }} />
              </div>
            ))}

            <TamagotchiScene
              character={activeChar}
              background={activeBg}
              mood={activeMood}
              animate={true}
            />
          </div>

          {/* All 4 characters preview row */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
              ▸ All characters (idle)
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {characters.map(char => (
                <div
                  key={char.id}
                  onClick={() => setActiveChar(char.id)}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    border: `2px solid ${activeChar === char.id ? char.color : "rgba(255,255,255,0.08)"}`,
                    background: activeChar === char.id ? `${char.color}10` : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s",
                    boxShadow: activeChar === char.id ? `0 0 16px ${char.color}40` : "none",
                    clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
                  }}
                >
                  <AnimatedSprite
                    frames={
                      char.id === "specter" ? [SPECTER_IDLE, SPECTER_WALK_1, SPECTER_WALK_2, SPECTER_IDLE] :
                      char.id === "blobby"  ? [BLOBBY_IDLE, BLOBBY_BOUNCE_1, BLOBBY_BOUNCE_2, BLOBBY_IDLE] :
                      char.id === "sparky"  ? [SPARKY_IDLE, SPARKY_BLINK, SPARKY_IDLE, SPARKY_IDLE] :
                                              [FLUFFY_IDLE, FLUFFY_HAPPY, FLUFFY_IDLE, FLUFFY_IDLE]
                    }
                    palette={
                      char.id === "specter" ? SPECTER_PALETTE_FIXED :
                      char.id === "blobby"  ? BLOBBY_PALETTE :
                      char.id === "sparky"  ? SPARKY_PALETTE :
                                              FLUFFY_PALETTE
                    }
                    scale={3}
                    fps={3}
                  />
                  <span style={{ fontSize: 8, color: activeChar === char.id ? char.color : "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {char.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* All moods for active character */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
              ▸ Mood poses — {activeChar}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { id: "idle",  label: "Idle",   frames: activeChar === "specter" ? [SPECTER_IDLE] : activeChar === "blobby" ? [BLOBBY_IDLE] : activeChar === "sparky" ? [SPARKY_IDLE] : [FLUFFY_IDLE], palette: activeChar === "specter" ? SPECTER_PALETTE_FIXED : activeChar === "blobby" ? BLOBBY_PALETTE : activeChar === "sparky" ? SPARKY_PALETTE : FLUFFY_PALETTE },
                { id: "happy", label: "Happy",  frames: activeChar === "specter" ? [SPECTER_HAPPY] : activeChar === "blobby" ? [BLOBBY_HAPPY] : activeChar === "sparky" ? [SPARKY_HAPPY] : [FLUFFY_HAPPY], palette: activeChar === "specter" ? SPECTER_PALETTE_FIXED : activeChar === "blobby" ? BLOBBY_PALETTE : activeChar === "sparky" ? SPARKY_PALETTE : FLUFFY_PALETTE },
                { id: "sad",   label: "Sad",    frames: activeChar === "specter" ? [SPECTER_SAD] : activeChar === "blobby" ? [BLOBBY_SAD] : activeChar === "sparky" ? [SPARKY_IDLE] : [FLUFFY_IDLE], palette: activeChar === "specter" ? SPECTER_PALETTE_FIXED : activeChar === "blobby" ? BLOBBY_PALETTE : activeChar === "sparky" ? SPARKY_PALETTE : FLUFFY_PALETTE },
                { id: "sleep", label: "Sleep",  frames: activeChar === "specter" ? [SPECTER_SLEEP] : activeChar === "blobby" ? [BLOBBY_BOUNCE_1] : activeChar === "sparky" ? [SPARKY_BLINK] : [FLUFFY_IDLE], palette: activeChar === "specter" ? SPECTER_PALETTE_FIXED : activeChar === "blobby" ? BLOBBY_PALETTE : activeChar === "sparky" ? SPARKY_PALETTE : FLUFFY_PALETTE },
              ].map(pose => (
                <div key={pose.id} style={{
                  padding: "8px 10px",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}>
                  <PixelSprite pixels={pose.frames[0]} palette={pose.palette} scale={3} />
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {pose.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Background previews */}
          <div>
            <p style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
              ▸ Background environments
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {backgrounds.map(bg => (
                <div
                  key={bg.id}
                  onClick={() => setActiveBg(bg.id)}
                  style={{
                    cursor: "pointer",
                    border: `2px solid ${activeBg === bg.id ? "#05d9e8" : "rgba(255,255,255,0.06)"}`,
                    overflow: "hidden",
                    imageRendering: "pixelated",
                    transition: "all 0.15s",
                    boxShadow: activeBg === bg.id ? "0 0 16px rgba(5,217,232,0.4)" : "none",
                  }}
                >
                  <PixelBackground type={bg.id} scale={2} />
                  <div style={{ padding: "4px 6px", background: "rgba(0,0,0,0.7)" }}>
                    <span style={{ fontSize: 7, color: activeBg === bg.id ? "#05d9e8" : "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      {bg.icon} {bg.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Interactive companion card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Companion card */}
          <div style={{
            padding: 16,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            clipPath: "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.3em", color: `${charColor}80`, textTransform: "uppercase", marginBottom: 10 }}>
              ▸ your companion
            </div>

            {/* Character name + emoji */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: charColor, letterSpacing: -0.5 }}>
                  {characters.find(c => c.id === activeChar)?.name}
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  {activeMood} mode
                </div>
              </div>
              <div style={{ fontSize: 28 }}>{characters.find(c => c.id === activeChar)?.emoji}</div>
            </div>

            {/* Stats */}
            <div style={{ marginBottom: 16 }}>
              <PixelStatBar label="Mood"    value={stats.mood}   color="#ffde7a" />
              <PixelStatBar label="Hunger"  value={stats.hunger} color="#ff2a6d" />
              <PixelStatBar label="Energy"  value={stats.energy} color="#05d9e8" />
              <PixelStatBar label="Love"    value={stats.love}   color="#ff9de2" />
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <PixelButton label="Feed"  icon="🍬" color="#ff2a6d" onClick={feed} />
              <PixelButton label="Play"  icon="🎮" color="#ffde7a" onClick={play} />
              <PixelButton label="Sleep" icon="💤" color="#b122e5" onClick={sleep_} />
            </div>
          </div>

          {/* Mood switcher */}
          <div style={{
            padding: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 10 }}>
              ▸ set mood manually
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {moods.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setActiveMood(mood.id)}
                  style={{
                    padding: "8px",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    border: `1px solid ${activeMood === mood.id ? mood.color : "rgba(255,255,255,0.08)"}`,
                    background: activeMood === mood.id ? `${mood.color}15` : "transparent",
                    color: activeMood === mood.id ? mood.color : "rgba(255,255,255,0.3)",
                    transition: "all 0.1s",
                    clipPath: "polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)",
                  }}
                >
                  {mood.icon} {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Particle effects preview */}
          <div style={{
            padding: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            clipPath: "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>
              ▸ particle sprites
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "space-around" }}>
              {[
                { sprite: HEART_SPRITE, label: "Love" },
                { sprite: STAR_SPRITE, label: "Star" },
                { sprite: ZZZ_SPRITE, label: "Sleep" },
              ].map(({ sprite, label }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <PixelSprite pixels={sprite.pixels} palette={sprite.palette} scale={4} />
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Export note */}
          <div style={{
            padding: 12,
            background: "rgba(5,217,232,0.04)",
            border: "1px solid rgba(5,217,232,0.15)",
            clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
          }}>
            <p style={{ fontSize: 8, color: "rgba(5,217,232,0.6)", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px 0" }}>
              ▸ Integration note
            </p>
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", lineHeight: 1.8, margin: 0 }}>
              All sprites are pure pixel arrays rendered on canvas. Scale=4 for app use, scale=2 for thumbnails. Add to TamagotchiWidget in dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}