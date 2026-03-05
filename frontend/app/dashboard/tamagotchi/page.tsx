"use client";

import { AnimatedSprite, PixelBg } from "@/components/ui/tamagochi/backgrounds";
import { CHAR_REGISTRY } from "@/components/ui/tamagochi/sprites";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

const C = {
  cyan: "#05d9e8",
  purple: "#b122e5",
  pink: "#ff2a6d",
  bg: "#07070f",
  panel: "#0d0d1a",
  border: "#1c1c32",
  text: "#dde0ff",
  muted: "#424268",
};

const clip = {
  lg: "polygon(16px 0%,100% 0%,100% calc(100% - 16px),calc(100% - 16px) 100%,0% 100%,0% 16px)",
  lgR: "polygon(0% 0%,calc(100% - 16px) 0%,100% 16px,100% 100%,16px 100%,0% calc(100% - 16px))",
  md: "polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)",
  sm: "polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)",
};

const SPECIES = [
  {
    id: "specter",
    label: "Specter",
    desc: "Ghostly & ethereal",
    pixelId: "specter",
  },
  { id: "cat", label: "Kitty", desc: "Playful & curious", pixelId: "cat" },
  { id: "dog", label: "Pup", desc: "Loyal & energetic", pixelId: "dog" },
  { id: "frog", label: "Ribbit", desc: "Hoppy & chill", pixelId: "frog" },
  { id: "bunny", label: "Bun", desc: "Soft & jumpy", pixelId: "bunny" },
  { id: "foxy", label: "Foxy", desc: "Clever & swift", pixelId: "foxy" },
  { id: "blobby", label: "Blobby", desc: "Slimy & bouncy", pixelId: "blobby" },
  {
    id: "sparky",
    label: "Sparky",
    desc: "Robotic & precise",
    pixelId: "sparky",
  },
  { id: "panda", label: "Panda", desc: "Cuddly & calm", pixelId: "panda" },
  { id: "dragon", label: "Dragon", desc: "Fierce & warm", pixelId: "dragon" },
  { id: "fluffy", label: "Fluff", desc: "Soft & dreamy", pixelId: "fluffy" },
  {
    id: "witch",
    label: "Witch",
    desc: "Magical & mysterious",
    pixelId: "witch",
  },
  { id: "alien", label: "Alien", desc: "Cosmic & quirky", pixelId: "alien" },
];

const BACKGROUNDS = [
  { id: "night_city", label: "Night City" },
  { id: "bedroom", label: "Bedroom" },
  { id: "pixel_park", label: "Pixel Park" },
  { id: "space", label: "Space" },
  { id: "cyber", label: "Cyberpunk" },
  { id: "forest", label: "Forest" },
  { id: "ocean", label: "Deep Sea" },
  { id: "sunset", label: "Sunset" },
  { id: "nebula", label: "Nebula" },
  { id: "snow", label: "Arctic" },
  { id: "lava", label: "Lava" },
];

const OUTFITS = [
  { id: "none", label: "Bare" },
  { id: "hoodie", label: "Hoodie" },
  { id: "suit", label: "Suit" },
  { id: "tshirt", label: "Tee" },
  { id: "kimono", label: "Kimono" },
  { id: "armor", label: "Armor" },
  { id: "labcoat", label: "Lab" },
  { id: "spacesuit", label: "Space" },
];

const ACCESSORIES = [
  { id: "none", label: "None" },
  { id: "crown", label: "Crown" },
  { id: "glasses", label: "Glasses" },
  { id: "shades", label: "Shades" },
  { id: "tophat", label: "Top Hat" },
  { id: "bow", label: "Bow" },
  { id: "headphones", label: "Phones" },
  { id: "halo", label: "Halo" },
];

const ANIMATIONS = [
  {
    id: "idle",
    label: "Idle",
    desc: "Gentle breathing",
    css: "tamaBreathe 3s ease-in-out infinite",
    mood: "idle",
  },
  {
    id: "bounce",
    label: "Bounce",
    desc: "Springy jump",
    css: "tamaBounce 0.85s ease-in-out infinite",
    mood: "happy",
  },
  {
    id: "spin",
    label: "Spin",
    desc: "Full rotation",
    css: "tamaSpin 2.2s linear infinite",
    mood: "idle",
  },
  {
    id: "wave",
    label: "Wave",
    desc: "Side to side",
    css: "tamaWave 1.1s ease-in-out infinite",
    mood: "happy",
  },
  {
    id: "dance",
    label: "Dance",
    desc: "Groove mode",
    css: "tamaDance 0.55s ease-in-out infinite",
    mood: "happy",
  },
  {
    id: "sad",
    label: "Sad",
    desc: "Feeling down",
    css: "tamaBreathe 4s ease-in-out infinite",
    mood: "sad",
  },
  {
    id: "sleep",
    label: "Sleep",
    desc: "Zzz...",
    css: "tamaSleep 4s ease-in-out infinite",
    mood: "sleep",
  },
  {
    id: "excited",
    label: "Hyper",
    desc: "Max energy",
    css: "tamaHyper 0.28s ease-in-out infinite",
    mood: "happy",
  },
  {
    id: "float",
    label: "Float",
    desc: "Zero gravity",
    css: "tamaFloat 3.2s ease-in-out infinite",
    mood: "idle",
  },
];

const POSITION_GRID = [
  ["top-left", "top-center", "top-right"],
  [null, "center", null],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const POS_ICONS: Record<string, string> = {
  "top-left": "↖",
  "top-center": "↑",
  "top-right": "↗",
  center: "✦",
  "bottom-left": "↙",
  "bottom-center": "↓",
  "bottom-right": "↘",
};

const POS_CSS: Record<string, { top: string; left: string }> = {
  center: { top: "50%", left: "50%" },
  "top-left": { top: "20%", left: "22%" },
  "top-center": { top: "20%", left: "50%" },
  "top-right": { top: "20%", left: "78%" },
  "bottom-left": { top: "74%", left: "22%" },
  "bottom-center": { top: "74%", left: "50%" },
  "bottom-right": { top: "74%", left: "78%" },
};

const ALL_SCREENS = [
  {
    id: "tamagotchi",
    label: "Tamagotchi",
    emoji: "🐾",
    locked: true,
    desc: "Your pet companion",
  },
  {
    id: "photo-replay",
    label: "Photo Replay",
    emoji: "📸",
    locked: false,
    desc: "Latest partner photo",
  },
  {
    id: "photo-slideshow",
    label: "Slideshow",
    emoji: "🎞️",
    locked: false,
    desc: "All photos rotating",
  },
  {
    id: "custom-screen",
    label: "Custom Screen",
    emoji: "🖼️",
    locked: false,
    desc: "Your designed canvas",
  },
  {
    id: "message-feed",
    label: "Messages",
    emoji: "💬",
    locked: false,
    desc: "Recent message thread",
  },
];

const SECTION_TABS = [
  { id: "species", label: "Species" },
  { id: "background", label: "Background" },
  { id: "outfit", label: "Outfit" },
  { id: "accessory", label: "Accessory" },
  { id: "animation", label: "Animation" },
  { id: "position", label: "Position" },
  { id: "screens", label: "Screens" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'Courier New',monospace",
        fontSize: "0.58rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: "0.8rem",
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  color = C.cyan,
  pulse = false,
  children,
}: {
  color?: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.18rem 0.55rem",
        border: `1px solid ${color}`,
        color,
        fontSize: "0.58rem",
        fontFamily: "'Courier New',monospace",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        clipPath: clip.sm,
        background: `${color}14`,
      }}
    >
      {pulse && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            animation: "kfPulse 1.6s ease-in-out infinite",
            display: "inline-block",
          }}
        />
      )}
      {children}
    </span>
  );
}

function Card({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        clipPath: clip.lg,
        padding: "1.3rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FramePreview({ cfg }: { cfg: any }) {
  const charReg = CHAR_REGISTRY[cfg.species] ?? CHAR_REGISTRY.specter;
  const anim = ANIMATIONS.find((a) => a.id === cfg.animation) ?? ANIMATIONS[0];
  const pos = POS_CSS[cfg.position] ?? POS_CSS.center;
  const frames = charReg[anim.mood as keyof typeof charReg] ?? charReg.idle;

  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "800/480",
        position: "relative",
        overflow: "hidden",
        clipPath: clip.lgR,
        background: "#060610",
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <PixelBg type={cfg.background} scale={9} fillParent />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.05) 3px,rgba(0,0,0,0.05) 4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Corner brackets */}
      {[
        [
          { top: 7, left: 7 },
          {
            borderTop: `2px solid ${C.cyan}55`,
            borderLeft: `2px solid ${C.cyan}55`,
          },
        ],
        [
          { top: 7, right: 7 },
          {
            borderTop: `2px solid ${C.cyan}55`,
            borderRight: `2px solid ${C.cyan}55`,
          },
        ],
        [
          { bottom: 7, left: 7 },
          {
            borderBottom: `2px solid ${C.cyan}55`,
            borderLeft: `2px solid ${C.cyan}55`,
          },
        ],
        [
          { bottom: 7, right: 7 },
          {
            borderBottom: `2px solid ${C.cyan}55`,
            borderRight: `2px solid ${C.cyan}55`,
          },
        ],
      ].map(([p, b], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...p,
            width: 14,
            height: 14,
            zIndex: 3,
            ...b,
          }}
        />
      ))}

      {/* ── Character: outfit + accessory baked into pixel grid ── */}
      <div
        style={{
          position: "absolute",
          top: pos.top,
          left: pos.left,
          transform: "translate(-50%,-50%)",
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: anim.css,
        }}
      >
        <div style={{ filter: `drop-shadow(0 0 8px ${charReg.color}80)` }}>
          <AnimatedSprite
            frames={frames as any}
            palette={charReg.palette}
            scale={5}
            fps={3}
            outfit={cfg.outfit}
            accessory={cfg.accessory}
          />
        </div>
      </div>

      {/* HUD */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 12,
          zIndex: 5,
          fontFamily: "'Courier New',monospace",
          fontSize: "0.5rem",
          color: `${C.cyan}75`,
          display: "flex",
          gap: "0.8rem",
        }}
      >
        <span>❤ 87</span>
        <span>⚡ 64</span>
        <span>🎮 92</span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 12,
          zIndex: 5,
          fontFamily: "'Courier New',monospace",
          fontSize: "0.5rem",
          color: `${C.cyan}75`,
        }}
      >
        LVL 7
      </div>
      <div
        style={{
          position: "absolute",
          top: 9,
          left: 12,
          zIndex: 5,
          fontFamily: "'Courier New',monospace",
          fontSize: "0.5rem",
          color: `${C.purple}90`,
          letterSpacing: "0.08em",
        }}
      >
        {anim.label.toUpperCase()}
      </div>
    </div>
  );
}

function ScreenReorder({
  screens,
  onChange,
}: {
  screens: any[];
  onChange: (screens: any[]) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const drop = (i: number) => {
    if (dragging === null || dragging === i) {
      setDragging(null);
      setOver(null);
      return;
    }
    const arr = [...screens];
    const [moved] = arr.splice(dragging, 1);
    arr.splice(i, 0, moved);
    onChange(arr);
    setDragging(null);
    setOver(null);
  };

  const toggle = (id: string) => {
    const meta = ALL_SCREENS.find((s) => s.id === id);
    if (meta?.locked) return;
    if (screens.find((s) => s.id === id)) {
      if (screens.length <= 1) return;
      onChange(screens.filter((s) => s.id !== id));
    } else {
      onChange([...screens, { id }]);
    }
  };

  const inactive = ALL_SCREENS.filter(
    (s) => !screens.find((a) => a.id === s.id),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
      <div>
        <Label>Active screens — drag to set swipe order</Label>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
        >
          {screens.map((s, i) => {
            const meta = ALL_SCREENS.find((m) => m.id === s.id);
            const isOver = over === i;
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragging(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDrop={() => drop(i)}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  padding: "0.55rem 0.8rem",
                  background: isOver ? `${C.cyan}12` : "#12121e",
                  border: `1px solid ${isOver ? C.cyan : C.border}`,
                  clipPath: clip.sm,
                  cursor: "grab",
                  opacity: dragging === i ? 0.3 : 1,
                  transition: "all 0.12s",
                }}
              >
                <span
                  style={{
                    color: C.muted,
                    fontSize: "0.75rem",
                    userSelect: "none",
                  }}
                >
                  ⣿
                </span>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `${i === 0 ? C.cyan : C.purple}1a`,
                    border: `1px solid ${i === 0 ? C.cyan : C.purple}40`,
                    clipPath: clip.sm,
                    fontSize: "0.55rem",
                    fontFamily: "'Courier New',monospace",
                    color: i === 0 ? C.cyan : C.purple,
                  }}
                >
                  {i === 0 ? "⌂" : i + 1}
                </div>
                <span style={{ fontSize: "1rem" }}>{meta?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: i === 0 ? C.cyan : C.text,
                      fontWeight: i === 0 ? 600 : 400,
                    }}
                  >
                    {meta?.label}
                    {meta?.locked && (
                      <span
                        style={{
                          color: C.muted,
                          fontSize: "0.57rem",
                          marginLeft: "0.4rem",
                          fontFamily: "monospace",
                        }}
                      >
                        [locked]
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: C.muted }}>
                    {meta?.desc}
                  </div>
                </div>
                <Pill color={i === 0 ? C.cyan : C.muted}>
                  {i === 0 ? "Home" : `#${i + 1}`}
                </Pill>
                {!meta?.locked && (
                  <button
                    onClick={() => toggle(s.id)}
                    style={{
                      background: "none",
                      border: `1px solid ${C.pink}35`,
                      color: C.pink,
                      fontSize: "0.6rem",
                      cursor: "pointer",
                      padding: "0.15rem 0.38rem",
                      clipPath: clip.sm,
                      outline: "none",
                      transition: "border-color 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = C.pink)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = C.pink + "35")
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {inactive.length > 0 && (
        <div>
          <Label>Add screens</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {inactive.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.38rem 0.65rem",
                  background: "transparent",
                  border: `1px dashed ${C.border}`,
                  color: C.muted,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  clipPath: clip.sm,
                  transition: "all 0.13s",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.cyan;
                  e.currentTarget.style.color = C.cyan;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.muted;
                }}
              >
                <span>{s.emoji}</span>
                <span>+ {s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          padding: "0.65rem 0.9rem",
          background: `${C.purple}0e`,
          border: `1px solid ${C.purple}28`,
          clipPath: clip.sm,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "0.63rem",
            color: `${C.purple}aa`,
            fontFamily: "'Courier New',monospace",
            letterSpacing: "0.06em",
          }}
        >
          ← swipe left / right on frame →
        </span>
        <Pill color={C.purple}>
          {screens.length} screen{screens.length !== 1 ? "s" : ""}
        </Pill>
      </div>
    </div>
  );
}

function PositionGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(3,56px)",
        gridTemplateRows: "repeat(3,56px)",
        gap: 4,
      }}
    >
      {POSITION_GRID.flat().map((id, i) => {
        if (!id) return <div key={i} />;
        const sel = value === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={id.replace(/-/g, " ")}
            style={{
              background: sel ? `${C.cyan}20` : "#12121e",
              border: `1px solid ${sel ? C.cyan : C.border}`,
              color: sel ? C.cyan : C.muted,
              fontSize: "1.1rem",
              cursor: "pointer",
              clipPath: clip.sm,
              transition: "all 0.13s",
              outline: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (!sel) e.currentTarget.style.borderColor = C.cyan + "60";
            }}
            onMouseLeave={(e) => {
              if (!sel) e.currentTarget.style.borderColor = C.border;
            }}
          >
            {POS_ICONS[id]}
          </button>
        );
      })}
    </div>
  );
}

export default function TamagotchiPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [saved, setSaved] = useState(false);
  const [cfg, setCfg] = useState({
    species: "specter",
    background: "night_city",
    outfit: "none",
    accessory: "none",
    animation: "idle",
    position: "center",
  });

  
  const [screens, setScreens] = useState([
    { id: "tamagotchi" },
    { id: "photo-replay" },
    { id: "photo-slideshow" },
    { id: "custom-screen" },
  ]);

  const set = useCallback(
    (k: string) => (v: any) => setCfg((c) => ({ ...c, [k]: v })),
    [],
  );

  const handleSave = () => {
    try {
      localStorage.setItem("tama_config", JSON.stringify(cfg));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2800);
    router.push("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "system-ui,-apple-system,sans-serif",
        padding: "1.75rem 2rem",
      }}
    >
      <style>{`
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;background:transparent;}
        ::-webkit-scrollbar-thumb{background:#1c1c32;}
        button{font-family:inherit;}
        @keyframes tamaBreathe{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.06)}}
        @keyframes tamaBounce{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-20px)}}
        @keyframes tamaSpin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes tamaWave{0%,100%{transform:translate(-50%,-50%) rotate(-12deg)}50%{transform:translate(-50%,-50%) rotate(12deg)}}
        @keyframes tamaDance{0%,100%{transform:translate(-50%,-50%) translateX(-9px) rotate(-7deg)}50%{transform:translate(-50%,-50%) translateX(9px) rotate(7deg)}}
        @keyframes tamaSleep{0%,100%{transform:translate(-50%,-50%) scale(1) rotate(-3deg);opacity:.8}50%{transform:translate(-50%,-50%) scale(.96) rotate(3deg);opacity:1}}
        @keyframes tamaHyper{0%,100%{transform:translate(-50%,-50%) translateY(0) scale(1)}25%{transform:translate(-50%,-50%) translateY(-18px) scale(1.12)}75%{transform:translate(-50%,-50%) translateY(-9px) scale(1.06)}}
        @keyframes tamaFloat{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-16px)}}
        @keyframes kfPulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes kfFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes kfGlow{0%,100%{box-shadow:0 0 8px #05d9e830}50%{box-shadow:0 0 24px #05d9e860}}
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1.65rem",
              letterSpacing: "-0.01em",
              background: `linear-gradient(95deg,${C.cyan} 0%,${C.purple} 55%,${C.pink} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "0.3rem",
              lineHeight: 1.1,
            }}
          >
            Tamagotchi Studio
          </div>
          <div
            style={{
              fontFamily: "'Courier New',monospace",
              fontSize: "0.6rem",
              color: C.muted,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            companion customization · frame screen manager
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {saved && (
            <div style={{ animation: "kfFadeUp 0.2s ease" }}>
              <Pill color={C.cyan} pulse>
                Pushed to frame ✓
              </Pill>
            </div>
          )}
          <button
            onClick={handleSave}
            style={{
              padding: "0.55rem 1.35rem",
              background: `linear-gradient(135deg,${C.cyan}22,${C.purple}22)`,
              border: `1px solid ${C.cyan}`,
              color: C.cyan,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              clipPath: clip.md,
              letterSpacing: "0.06em",
              outline: "none",
              animation: "kfGlow 2.5s ease-in-out infinite",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = `linear-gradient(135deg,${C.cyan}35,${C.purple}35)`)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = `linear-gradient(135deg,${C.cyan}22,${C.purple}22)`)
            }
          >
            Push to Frame →
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          {/* Section tabs */}
          <div style={{ display: "flex", gap: "0.28rem", flexWrap: "wrap" }}>
            {SECTION_TABS.map((t, i) => {
              const active = i === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    padding: "0.38rem 0.82rem",
                    background: active ? `${C.cyan}1e` : "transparent",
                    border: `1px solid ${active ? C.cyan : C.border}`,
                    color: active ? C.cyan : C.muted,
                    fontSize: "0.72rem",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    clipPath: clip.sm,
                    transition: "all 0.13s",
                    outline: "none",
                    letterSpacing: "0.03em",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <Card style={{ animation: "kfFadeUp 0.18s ease", minHeight: 300 }}>
            {tab === 0 && (
              <>
                <Label>Choose your companion species</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: "0.5rem",
                  }}
                >
                  {SPECIES.map((item) => {
                    const reg = item.pixelId
                      ? CHAR_REGISTRY[item.pixelId]
                      : null;
                    const sel = cfg.species === item.id;
                    const accentCol = reg?.color ?? C.muted;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (reg) set("species")(item.id);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.75rem 0.3rem",
                          background: sel ? `${accentCol}18` : "transparent",
                          border: `1px solid ${sel ? accentCol : C.border}`,
                          color: sel ? accentCol : C.muted,
                          cursor: reg ? "pointer" : "not-allowed",
                          clipPath: clip.sm,
                          transition: "all 0.14s",
                          outline: "none",
                          opacity: reg ? 1 : 0.4,
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          if (reg && !sel) {
                            e.currentTarget.style.borderColor =
                              accentCol + "66";
                            e.currentTarget.style.color = C.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (reg && !sel) {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.muted;
                          }
                        }}
                      >
                        {reg ? (
                          <div
                            style={{
                              filter: sel
                                ? `drop-shadow(0 0 8px ${accentCol}80)`
                                : "none",
                              transition: "filter 0.2s",
                            }}
                          >
                            <AnimatedSprite
                              frames={reg.idle}
                              palette={reg.palette}
                              scale={3}
                              fps={2}
                              outfit={cfg.outfit}
                              accessory={cfg.accessory}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 30,
                              height: 33,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.4rem",
                            }}
                          >
                            ?
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: sel ? 600 : 400,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: "0.52rem",
                            color: sel ? `${accentCol}aa` : C.muted,
                            textAlign: "center",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.desc}
                        </span>
                        {!reg && (
                          <span
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              fontSize: "0.45rem",
                              fontFamily: "'Courier New',monospace",
                              color: C.muted,
                              border: `1px solid ${C.border}`,
                              padding: "0 3px",
                              clipPath:
                                "polygon(2px 0,100% 0,100% calc(100% - 2px),calc(100% - 2px) 100%,0 100%,0 2px)",
                            }}
                          >
                            SOON
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 1 && (
              <>
                <Label>Frame background environment</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: "0.5rem",
                  }}
                >
                  {BACKGROUNDS.map((item) => {
                    const sel = cfg.background === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => set("background")(item.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.5rem 0.3rem",
                          background: sel ? `${C.cyan}12` : "transparent",
                          border: `1px solid ${sel ? C.cyan : C.border}`,
                          color: sel ? C.cyan : C.muted,
                          cursor: "pointer",
                          clipPath: clip.sm,
                          transition: "all 0.14s",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.cyan + "55";
                            e.currentTarget.style.color = C.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.muted;
                          }
                        }}
                      >
                        <div
                          style={{
                            border: `1px solid ${sel ? C.cyan : C.border}`,
                            clipPath: clip.sm,
                            overflow: "hidden",
                            boxShadow: sel ? `0 0 10px ${C.cyan}40` : "none",
                            transition: "all 0.14s",
                          }}
                        >
                          <PixelBg type={item.id} scale={2} />
                        </div>
                        <span
                          style={{
                            fontSize: "0.58rem",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 2 && (
              <>
                <Label>Dress your companion</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: "0.4rem",
                  }}
                >
                  {OUTFITS.map((item) => {
                    const sel = cfg.outfit === item.id;
                    const charReg =
                      CHAR_REGISTRY[cfg.species] ?? CHAR_REGISTRY.specter;
                    return (
                      <button
                        key={item.id}
                        onClick={() => set("outfit")(item.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.75rem 0.4rem",
                          background: sel ? `${C.cyan}16` : "transparent",
                          border: `1px solid ${sel ? C.cyan : C.border}`,
                          color: sel ? C.cyan : C.muted,
                          cursor: "pointer",
                          clipPath: clip.sm,
                          transition: "all 0.14s",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.cyan + "55";
                            e.currentTarget.style.color = C.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.muted;
                          }
                        }}
                      >
                        <div
                          style={{
                            filter: sel
                              ? `drop-shadow(0 0 6px ${C.cyan}55)`
                              : "none",
                          }}
                        >
                          <AnimatedSprite
                            frames={charReg.idle}
                            palette={charReg.palette}
                            scale={3}
                            fps={2}
                            outfit={item.id}
                            accessory={cfg.accessory}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: sel ? 600 : 400,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {tab === 3 && (
              <>
                <Label>Equip an accessory</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: "0.4rem",
                  }}
                >
                  {ACCESSORIES.map((item) => {
                    const sel = cfg.accessory === item.id;
                    const charReg =
                      CHAR_REGISTRY[cfg.species] ?? CHAR_REGISTRY.specter;
                    return (
                      <button
                        key={item.id}
                        onClick={() => set("accessory")(item.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.75rem 0.4rem",
                          background: sel ? `${C.cyan}16` : "transparent",
                          border: `1px solid ${sel ? C.cyan : C.border}`,
                          color: sel ? C.cyan : C.muted,
                          cursor: "pointer",
                          clipPath: clip.sm,
                          transition: "all 0.14s",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.cyan + "55";
                            e.currentTarget.style.color = C.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.muted;
                          }
                        }}
                      >
                        {/* Live pixel preview with this accessory applied */}
                        <div
                          style={{
                            filter: sel
                              ? `drop-shadow(0 0 6px ${C.cyan}55)`
                              : "none",
                          }}
                        >
                          <AnimatedSprite
                            frames={charReg.idle}
                            palette={charReg.palette}
                            scale={3}
                            fps={2}
                            outfit={cfg.outfit}
                            accessory={item.id}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: sel ? 600 : 400,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ANIMATION */}
            {tab === 4 && (
              <>
                <Label>Idle animation style</Label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.45rem",
                  }}
                >
                  {ANIMATIONS.map((a) => {
                    const sel = cfg.animation === a.id;
                    const charReg =
                      CHAR_REGISTRY[cfg.species] ?? CHAR_REGISTRY.specter;
                    const frames =
                      charReg[a.mood as keyof typeof charReg] ?? charReg.idle;
                    return (
                      <button
                        key={a.id}
                        onClick={() => set("animation")(a.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.7rem",
                          padding: "0.55rem 0.75rem",
                          textAlign: "left",
                          background: sel ? `${C.cyan}14` : "transparent",
                          border: `1px solid ${sel ? C.cyan : C.border}`,
                          color: sel ? C.cyan : C.muted,
                          cursor: "pointer",
                          clipPath: clip.sm,
                          transition: "all 0.13s",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.cyan + "45";
                            e.currentTarget.style.color = C.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sel) {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.color = C.muted;
                          }
                        }}
                      >
                        <div
                          style={{
                            flexShrink: 0,
                            filter: sel
                              ? `drop-shadow(0 0 6px ${C.cyan}80)`
                              : "none",
                          }}
                        >
                          <AnimatedSprite
                            frames={frames as any}
                            palette={charReg.palette}
                            scale={2}
                            fps={sel ? 4 : 2}
                            outfit={cfg.outfit}
                            accessory={cfg.accessory}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                            {a.label}
                          </div>
                          <div
                            style={{
                              fontSize: "0.57rem",
                              opacity: 0.6,
                              marginTop: "0.1rem",
                            }}
                          >
                            {a.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* POSITION */}
            {tab === 5 && (
              <>
                <Label>Anchor position on the e-ink canvas</Label>
                <div
                  style={{
                    display: "flex",
                    gap: "2.5rem",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: C.muted,
                        fontFamily: "'Courier New',monospace",
                        marginBottom: "0.7rem",
                      }}
                    >
                      click to place
                    </div>
                    <PositionGrid
                      value={cfg.position}
                      onChange={set("position")}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div
                      style={{
                        padding: "0.8rem",
                        background: `${C.cyan}0e`,
                        border: `1px solid ${C.cyan}35`,
                        clipPath: clip.sm,
                        marginBottom: "0.8rem",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "1.3rem",
                          color: C.cyan,
                          fontWeight: 700,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {POS_ICONS[cfg.position]}{" "}
                        {cfg.position.replace(/-/g, " ")}
                      </div>
                      <div style={{ fontSize: "0.62rem", color: C.muted }}>
                        Companion anchored {cfg.position.replace(/-/g, " ")} of
                        canvas
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: "0.63rem",
                        color: C.muted,
                        lineHeight: 1.65,
                      }}
                    >
                      Stats bars, XP counters, and overlays automatically reflow
                      around the companion&apos;s anchor point on the physical
                      display.
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 6 && (
              <ScreenReorder screens={screens} onChange={setScreens} />
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
            position: "sticky",
            top: "1.75rem",
          }}
        >
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.7rem",
              }}
            >
              <Label>Live preview</Label>
              <Pill color={C.purple}>800 × 480</Pill>
            </div>
            <FramePreview cfg={cfg} />
            <div
              style={{
                marginTop: "0.85rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.3rem 0.6rem",
                padding: "0.65rem",
                background: "#12121e",
                clipPath: clip.sm,
              }}
            >
              {[
                ["Species", SPECIES.find((s) => s.id === cfg.species)?.label],
                [
                  "Background",
                  BACKGROUNDS.find((b) => b.id === cfg.background)?.label,
                ],
                ["Outfit", OUTFITS.find((o) => o.id === cfg.outfit)?.label],
                [
                  "Accessory",
                  ACCESSORIES.find((a) => a.id === cfg.accessory)?.label,
                ],
                [
                  "Animation",
                  ANIMATIONS.find((a) => a.id === cfg.animation)?.label,
                ],
                ["Position", cfg.position.replace(/-/g, " ")],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.4rem",
                    fontSize: "0.58rem",
                    fontFamily: "'Courier New',monospace",
                  }}
                >
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ color: C.cyan, textTransform: "capitalize" }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.7rem",
              }}
            >
              <Label>Screen queue</Label>
              <Pill color={C.cyan}>{screens.length} active</Pill>
            </div>
            {screens.map((s, i) => {
              const meta = ALL_SCREENS.find((m) => m.id === s.id);
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.32rem 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: "0.68rem",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${i === 0 ? C.cyan : C.muted}18`,
                      border: `1px solid ${i === 0 ? C.cyan : C.border}`,
                      clipPath: clip.sm,
                      fontFamily: "'Courier New',monospace",
                      fontSize: "0.55rem",
                      color: i === 0 ? C.cyan : C.muted,
                    }}
                  >
                    {i === 0 ? "⌂" : i + 1}
                  </span>
                  <span>{meta?.emoji}</span>
                  <span style={{ flex: 1, color: i === 0 ? C.cyan : C.text }}>
                    {meta?.label}
                  </span>
                  {i === 0 && <Pill color={C.cyan}>Home</Pill>}
                </div>
              );
            })}
            <div
              style={{
                marginTop: "0.65rem",
                textAlign: "center",
                fontSize: "0.58rem",
                color: C.muted,
                fontFamily: "'Courier New',monospace",
                letterSpacing: "0.06em",
              }}
            >
              ← swipe left / right on frame →
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
