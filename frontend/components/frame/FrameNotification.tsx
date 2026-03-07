/**
 * FrameNotification.tsx
 *
 * Shown on the e-ink frame (800×480) when new content arrives.
 * Renders the partner's pixel avatar in the bottom-left corner as a glowing badge.
 *
 * Usage (in frame renderer):
 *   <FrameNotification type="photo" partnerAvatar={pollResponse.partner_avatar} onDismiss={...} />
 */

"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FramePixelAvatar {
  pixels:  number[];
  palette: string[];
  width:   number;
  height:  number;
}

interface FrameNotificationProps {
  type:          "photo" | "message" | "drawing" | "generic";
  partnerAvatar?: FramePixelAvatar | null;
  partnerName?:  string;
  preview?:      string;  // optional image URL or text snippet
  onDismiss?:    () => void;
  autoDismissMs?: number;
}

// ─── Default fallback avatar (heart sprite, 16×16) ────────────────────────────
const DEFAULT_AVATAR: FramePixelAvatar = {
  palette: ["#ff2a6d", "#b122e5"],
  width: 16,
  height: 16,
  pixels: [
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1, 0, 0,-1,-1, 0, 0,-1,-1,-1,-1,-1,-1,-1,-1,
    -1, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1,
    -1, 0, 0, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1,
    -1, 0, 1, 0, 0, 0, 0, 1, 0,-1,-1,-1,-1,-1,-1,-1,
    -1,-1, 0, 0, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1, 0, 0, 0, 0,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1, 0, 0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  ]
};

// ─── Pixel canvas renderer ────────────────────────────────────────────────────
function PixelCanvas({ avatar, scale }: { avatar: FramePixelAvatar; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { pixels, palette, width, height } = avatar;
    canvas.width  = width  * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      if (p === -1) continue;
      const x = i % width, y = Math.floor(i / width);
      ctx.fillStyle = palette[p] ?? "#ffffff";
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }, [avatar, scale]);

  return (
    <canvas
      ref={ref}
      style={{ imageRendering: "pixelated", display: "block" }}
    />
  );
}

// ─── Notification icon ────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  photo:    "✦ new photo",
  message:  "✉ new message",
  drawing:  "✏ new drawing",
  generic:  "✦ new content",
};

const ACCENT: Record<string, string> = {
  photo:   "#05d9e8",
  message: "#b122e5",
  drawing: "#ff2a6d",
  generic: "#f5d300",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function FrameNotification({
  type,
  partnerAvatar,
  partnerName,
  preview,
  onDismiss,
  autoDismissMs = 8000,
}: FrameNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const avatar = partnerAvatar ?? DEFAULT_AVATAR;
  const accent = ACCENT[type] ?? ACCENT.generic;

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (!autoDismissMs) return;
    const t = setTimeout(dismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs]);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => { setVisible(false); onDismiss?.(); }, 400);
  };

  // Pixel scale: 4× for 16×16, 3× for 32×32
  const avatarScale = avatar.width === 16 ? 4 : 3;
  const badgeSize   = avatar.width * avatarScale;

  return (
    <div
      onClick={dismiss}
      style={{
        // Fullscreen overlay — frame is 800×480
        position:  "fixed",
        inset:     0,
        display:   "flex",
        alignItems:    "flex-end",
        justifyContent: "flex-start",
        padding:   "0 0 32px 32px",
        pointerEvents: "none",
        zIndex:    1000,
      }}
    >
      <div style={{
        // Card
        background:   "rgba(7,7,15,0.92)",
        border:       `1px solid ${accent}44`,
        borderLeft:   `3px solid ${accent}`,
        borderRadius: 10,
        padding:      "16px 20px 16px 16px",
        display:      "flex",
        alignItems:   "flex-end",
        gap:          16,
        backdropFilter: "blur(4px)",
        boxShadow:    `0 0 40px ${accent}22, 0 8px 32px rgba(0,0,0,0.8)`,
        pointerEvents: "auto",
        cursor:       "pointer",
        minWidth:     220,
        maxWidth:     340,

        // Slide-up entrance
        transform:  visible && !leaving ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
        opacity:    visible && !leaving ? 1 : 0,
        transition: leaving
          ? "opacity 0.35s ease, transform 0.35s ease"
          : "opacity 0.4s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Text content */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize:      13,
            fontFamily:    "'DM Mono', 'Fira Mono', monospace",
            color:         accent,
            letterSpacing: 1.5,
            marginBottom:  6,
          }}>
            {ICONS[type]}
          </div>
          {partnerName && (
            <div style={{
              fontSize:      11,
              color:         "#888",
              fontFamily:    "monospace",
              letterSpacing: 0.5,
              marginBottom:  4,
            }}>
              from {partnerName}
            </div>
          )}
          {preview && (
            <div style={{
              fontSize:      10,
              color:         "#555",
              fontFamily:    "monospace",
              maxWidth:      180,
              overflow:      "hidden",
              textOverflow:  "ellipsis",
              whiteSpace:    "nowrap",
            }}>
              {preview}
            </div>
          )}
          <div style={{
            fontSize:      9,
            color:         "#333",
            fontFamily:    "monospace",
            marginTop:     8,
            letterSpacing: 0.5,
          }}>
            tap to dismiss
          </div>
        </div>

        {/* Avatar badge — bottom-right corner of the notification card */}
        <div style={{
          position:     "relative",
          flexShrink:   0,
        }}>
          {/* Glow halo */}
          <div style={{
            position:     "absolute",
            inset:        -6,
            borderRadius: 6,
            background:   `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
          {/* Border frame */}
          <div style={{
            border:       `1px solid ${accent}55`,
            borderRadius: 5,
            padding:      4,
            background:   `${accent}08`,
            position:     "relative",
          }}>
            <PixelCanvas avatar={avatar} scale={avatarScale} />
            {/* Corner sparkle */}
            <div style={{
              position:   "absolute",
              top:        -4,
              right:      -4,
              width:      8,
              height:     8,
              borderRadius: "50%",
              background: accent,
              boxShadow:  `0 0 6px ${accent}`,
              animation:  "pulse 1.5s ease-in-out infinite",
            }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}