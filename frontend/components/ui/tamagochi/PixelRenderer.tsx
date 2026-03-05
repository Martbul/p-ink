"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/ui/tamagochi/PixelRenderer.tsx
// Three reusable canvas-based pixel art renderers.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { type Palette, type Frame, BACKGROUNDS, BG_FALLBACK_COLORS } from "./sprites";

// ─── PixelSprite ─────────────────────────────────────────────────────────────
// Renders a single pixel-art frame onto a <canvas>.
// `pixels`  — 2D array of palette indices (0 = transparent)
// `palette` — map of index → hex colour string
// `scale`   — integer upscale factor (default 4 → each "pixel" = 4×4 screen px)

interface PixelSpriteProps {
  pixels:  Frame;
  palette: Palette;
  scale?:  number;
  style?:  React.CSSProperties;
}

export function PixelSprite({ pixels, palette, scale = 4, style = {} }: PixelSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const h = pixels.length;
    const w = pixels[0].length;
    canvas.width  = w * scale;
    canvas.height = h * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = pixels[y][x];
        if (!idx) continue;
        ctx.fillStyle = palette[idx] ?? "transparent";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [pixels, palette, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{ imageRendering: "pixelated", display: "block", ...style }}
    />
  );
}

// ─── AnimatedSprite ───────────────────────────────────────────────────────────
// Cycles through an array of frames at a given fps.

interface AnimatedSpriteProps {
  frames:  Frame[];
  palette: Palette;
  scale?:  number;
  fps?:    number;
  style?:  React.CSSProperties;
}

export function AnimatedSprite({ frames, palette, scale = 4, fps = 3, style = {} }: AnimatedSpriteProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames.length, fps]);

  return <PixelSprite pixels={frames[frame]} palette={palette} scale={scale} style={style} />;
}

// ─── PixelBg ─────────────────────────────────────────────────────────────────
// Renders a tiled pixel-art background from BACKGROUNDS map.
// Falls back to a solid colour for IDs that only have a fallback entry.
// `fillParent` — when true the canvas stretches to fill its container via CSS.

interface PixelBgProps {
  type:        string;
  scale?:      number;
  fillParent?: boolean;
}

export function PixelBg({ type, scale = 3, fillParent = false }: PixelBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const bg = BACKGROUNDS[type];

    if (!bg) {
      // Solid fallback for backgrounds without tile data
      canvas.width  = 20 * scale;
      canvas.height = 14 * scale;
      ctx.fillStyle = BG_FALLBACK_COLORS[type] ?? "#07070f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const h = bg.px.length;
    const w = bg.px[0].length;
    canvas.width  = w * scale;
    canvas.height = h * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const color = bg.pal[bg.px[y][x]];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [type, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        imageRendering: "pixelated",
        display: "block",
        ...(fillParent ? { width: "100%", height: "100%", objectFit: "cover" } : {}),
      }}
    />
  );
}