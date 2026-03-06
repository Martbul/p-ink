"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { useModal, ModalPresets } from "@/components/ui/info_modal";
import { api } from "@/api";
import { cn } from "@/lib/utils";
import { AnimatedSprite, PixelBg } from "@/components/ui/tamagochi/backgrounds";
import { CHAR_REGISTRY } from "@/components/ui/tamagochi/sprites";

const poly =
  "polygon(16px 0%,100% 0%,100% calc(100% - 16px),calc(100% - 16px) 100%,0% 100%,0% 16px)";
const polyRev =
  "polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))";
const polySm =
  "polygon(10px 0%,100% 0%,100% calc(100% - 10px),calc(100% - 10px) 100%,0% 100%,0% 10px)";
const polyXs =
  "polygon(6px 0%,100% 0%,100% calc(100% - 6px),calc(100% - 6px) 100%,0% 100%,0% 6px)";

const C = {
  cyan: "#05d9e8",
  purple: "#b122e5",
  pink: "#ff2a6d",
  white: "#ffffff",
};

const ANIM_CSS: Record<string, string> = {
  idle: "tamaBreathe 3s ease-in-out infinite",
  bounce: "tamaBounce 0.85s ease-in-out infinite",
  spin: "tamaSpin 2.2s linear infinite",
  wave: "tamaWave 1.1s ease-in-out infinite",
  dance: "tamaDance 0.55s ease-in-out infinite",
  sleep: "tamaSleep 4s ease-in-out infinite",
  excited: "tamaHyper 0.28s ease-in-out infinite",
  float: "tamaFloat 3.2s ease-in-out infinite",
};

const DEFAULT_TAMA_CONFIG = {
  species: "cat",
  background: "cyber",
  outfit: "none",
  accessory: "none",
  animation: "idle",
  position: "center",
};

const TAMA_STORAGE_KEY = "tama_config";

function loadTamaConfig() {
  if (typeof window === "undefined") return DEFAULT_TAMA_CONFIG;
  try {
    const raw = localStorage.getItem(TAMA_STORAGE_KEY);
    return raw
      ? { ...DEFAULT_TAMA_CONFIG, ...JSON.parse(raw) }
      : DEFAULT_TAMA_CONFIG;
  } catch {
    return DEFAULT_TAMA_CONFIG;
  }
}

const SCREENS_STORAGE_KEY = "dashboard_screens";

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

const DEFAULT_SCREENS = [
  { id: "tamagotchi" },
  { id: "photo-replay" },
  { id: "photo-slideshow" },
  { id: "custom-screen" },
];

function loadScreens() {
  if (typeof window === "undefined") return DEFAULT_SCREENS;
  try {
    const raw = localStorage.getItem(SCREENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SCREENS;
  } catch {
    return DEFAULT_SCREENS;
  }
}

function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function Pill({
  color,
  text,
  pulse,
}: {
  color: string;
  text: string;
  pulse?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest"
      style={{
        clipPath: polyXs,
        border: `1px solid ${color}40`,
        background: `${color}0e`,
        color,
      }}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", pulse && "animate-pulse")}
        style={{
          background: color,
          boxShadow: pulse ? `0 0 5px ${color}` : "none",
        }}
      />
      {text}
    </span>
  );
}

function PairFrameSetup({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const modal = useModal();
  const [mac, setMac] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePair() {
    if (!mac.trim()) return;
    setLoading(true);
    try {
      await pairDevice(mac.trim().toUpperCase());
      setOpen(false);
      modal.open({
        ...ModalPresets.pairSuccess(mac.trim().toUpperCase()),
        actions: [
          {
            label: "Continue →",
            variant: "primary",
            onClick: () => {
              modal.close();
              onPaired();
            },
          },
        ],
      });
    } catch (err) {
      modal.open({
        ...ModalPresets.pairError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
          {
            label: "Retry →",
            variant: "primary",
            onClick: () => {
              modal.close();
              setOpen(true);
            },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative p-5 transition-all cursor-pointer group"
        style={{
          clipPath: poly,
          background: `${C.cyan}05`,
          border: `1px solid ${C.cyan}25`,
        }}
        onClick={() => !open && setOpen(true)}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, ${C.cyan}, transparent)`,
          }}
        />
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{
              clipPath: polyXs,
              background: `${C.cyan}12`,
              border: `1px solid ${C.cyan}40`,
              color: C.cyan,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.2em]"
              style={{ color: `${C.cyan}70` }}
            >
              INIT_01
            </p>
            <h3
              className="text-sm font-bold uppercase tracking-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Pair your frame
            </h3>
          </div>
          <Pill color="#ffc800" text="Awaiting" pulse />
        </div>
        <p
          className="font-mono text-[10px] leading-relaxed mb-3"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          Power on your e-ink terminal — the MAC address will appear on screen.
        </p>
        {!open ? (
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: `${C.cyan}60` }}
          >
            Click to enter MAC →
          </span>
        ) : (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handlePair()}
              className="flex-1 font-mono text-sm px-3 py-2 uppercase outline-none"
              style={{
                clipPath: polyXs,
                background: "#07070f",
                border: `1px solid ${C.cyan}40`,
                color: "#fff",
              }}
            />
            <button
              onClick={handlePair}
              disabled={!mac.trim() || loading}
              className="px-4 font-mono text-[10px] uppercase font-bold tracking-widest disabled:opacity-40 transition-all"
              style={{
                clipPath: polyXs,
                border: `1px solid ${C.cyan}`,
                background: `${C.cyan}15`,
                color: C.cyan,
              }}
            >
              {loading ? "..." : "Sync"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="font-mono text-[10px] uppercase px-2"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PartnerSetup({ onLinked }: { onLinked: () => void }) {
  const { getToken } = useAuth();
  const { joinCouple } = useUser();
  const modal = useModal();
  const [mode, setMode] = useState<"choice" | "invite" | "join">("choice");
  const [inviteURL, setInviteURL] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!inviteURL) return;
    pollRef.current = setInterval(async () => {
      try {
        const t = await getToken();
        if (!t) return;
        const me = await api.getMe(t);
        if (me.couple?.status === "active") {
          clearInterval(pollRef.current!);
          onLinked();
        }
      } catch {
        /* non-fatal */
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [inviteURL, getToken, onLinked]);

  async function generateInvite() {
    setLoading(true);
    try {
      const t = await getToken();
      if (!t) return;
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!token.trim()) return;
    setLoading(true);
    let bare = token.trim();
    try {
      const u = new URL(bare);
      bare = u.searchParams.get("token") ?? bare;
    } catch {
      /* not a url */
    }
    try {
      await joinCouple(bare);
      onLinked();
    } catch (err) {
      modal.open({
        ...ModalPresets.joinError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative p-5 transition-all"
        style={{
          clipPath: polyRev,
          background: `${C.purple}05`,
          border: `1px solid ${C.purple}25`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${C.purple}, transparent)`,
          }}
        />
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 flex items-center justify-center flex-shrink-0"
            style={{
              clipPath: polyXs,
              background: `${C.purple}12`,
              border: `1px solid ${C.purple}40`,
              color: C.purple,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.2em]"
              style={{ color: `${C.purple}70` }}
            >
              INIT_02
            </p>
            <h3
              className="text-sm font-bold uppercase tracking-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Link partner
            </h3>
          </div>
        </div>
        {mode === "choice" && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setMode("invite");
                generateInvite();
              }}
              className="flex-1 py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
              style={{
                clipPath: polyXs,
                border: `1px solid ${C.purple}40`,
                background: `${C.purple}0a`,
                color: C.purple,
              }}
            >
              I&apos;ll invite them
            </button>
            <button
              onClick={() => setMode("join")}
              className="flex-1 py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
              style={{
                clipPath: polyXs,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              I have a link
            </button>
          </div>
        )}
        {mode === "invite" && (
          <div className="flex flex-col gap-2 mt-2">
            {loading && !inviteURL && (
              <div className="flex items-center gap-2">
                <Spinner />
                <span
                  className="font-mono text-[10px] uppercase"
                  style={{ color: `${C.purple}70` }}
                >
                  Generating...
                </span>
              </div>
            )}
            {inviteURL && (
              <>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteURL}
                    className="flex-1 font-mono text-[9px] px-3 py-2 min-w-0 outline-none"
                    style={{
                      clipPath: polyXs,
                      background: `${C.purple}08`,
                      border: `1px solid ${C.purple}30`,
                      color: `${C.purple}cc`,
                    }}
                  />
                  <button
                    onClick={copy}
                    className="px-3 font-mono text-[9px] uppercase font-bold tracking-widest shrink-0 transition-all"
                    style={{
                      clipPath: polyXs,
                      border: `1px solid ${C.purple}50`,
                      background: copied ? `${C.cyan}20` : `${C.purple}10`,
                      color: copied ? C.cyan : C.purple,
                    }}
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{
                    clipPath: polyXs,
                    background: `${C.purple}06`,
                    border: `1px solid ${C.purple}18`,
                  }}
                >
                  <span
                    className="w-3 h-3 rounded-full border-2 animate-spin shrink-0"
                    style={{
                      borderColor: `${C.purple}30`,
                      borderTopColor: C.purple,
                    }}
                  />
                  <span
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: `${C.purple}60` }}
                  >
                    Waiting for partner...
                  </span>
                </div>
              </>
            )}
            <button
              onClick={() => setMode("choice")}
              className="font-mono text-[9px] uppercase text-left mt-1"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              ← back
            </button>
          </div>
        )}
        {mode === "join" && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste invite link or token..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="flex-1 font-mono text-[10px] px-3 py-2 outline-none"
                style={{
                  clipPath: polyXs,
                  background: "#07070f",
                  border: `1px solid ${C.purple}40`,
                  color: "#fff",
                }}
              />
              <button
                onClick={handleJoin}
                disabled={!token.trim() || loading}
                className="px-4 font-mono text-[10px] uppercase font-bold tracking-widest disabled:opacity-40 transition-all"
                style={{
                  clipPath: polyXs,
                  border: `1px solid ${C.purple}`,
                  background: `${C.purple}10`,
                  color: C.purple,
                }}
              >
                {loading ? "..." : "Join"}
              </button>
            </div>
            <button
              onClick={() => setMode("choice")}
              className="font-mono text-[9px] uppercase text-left mt-1"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              ← back
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function FrameStatusBar() {
  const { device, partnerUser, content } = useUser();
  const online = isOnline(device?.last_seen);
  const queued = content.filter((c) => c.status === "queued").length;
  const displayed = content.find((c) => c.status === "displayed");

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-5 py-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn("w-2 h-2 rounded-full", online ? "animate-pulse" : "")}
          style={{
            background: online ? C.cyan : "rgba(255,255,255,0.2)",
            boxShadow: online ? `0 0 6px ${C.cyan}` : "none",
          }}
        />
        <span
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: online ? C.cyan : "rgba(255,255,255,0.3)" }}
        >
          Frame {online ? "online" : "offline"}
        </span>
      </div>
      <span className="w-px h-4 bg-white/10" />
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Last sync:{" "}
        <span style={{ color: "rgba(255,255,255,0.45)" }}>
          {timeAgo(device?.last_seen)}
        </span>
      </span>
      <span className="w-px h-4 bg-white/10" />
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Queue:{" "}
        <span
          style={{ color: queued > 0 ? C.purple : "rgba(255,255,255,0.45)" }}
        >
          {queued} item{queued !== 1 ? "s" : ""}
        </span>
      </span>
      {displayed && (
        <>
          <span className="w-px h-4 bg-white/10" />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Showing:{" "}
            <span style={{ color: "rgba(255,255,255,0.5)" }}>
              {displayed.type}
            </span>
          </span>
        </>
      )}
      {partnerUser && (
        <div className="ml-auto flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: C.purple, boxShadow: `0 0 4px ${C.purple}` }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: `${C.purple}aa` }}
          >
            {partnerUser.name?.split(" ")[0]}&apos;s frame
          </span>
        </div>
      )}
    </div>
  );
}

// ── SEND ACTION WIDGETS ──────────────────────────────────────────────────────

function PhotoWidget() {
  const { uploadContent } = useUser();
  const modal = useModal();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ src: string; file: File } | null>(
    null,
  );
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) =>
      setPreview({ src: e.target?.result as string, file });
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!preview) return;
    setUploading(true);
    try {
      await uploadContent(preview.file, "photo", caption || undefined);
      setPreview(null);
      setCaption("");
      modal.open({
        ...ModalPresets.transmitSuccess(),
        actions: [{ label: "Done", variant: "primary", onClick: modal.close }],
      });
    } catch (err) {
      modal.open({
        ...ModalPresets.transmitError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
          { label: "Retry →", variant: "primary", onClick: modal.close },
        ],
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative overflow-hidden"
        style={{ clipPath: poly, border: `1px solid rgba(255,255,255,0.07)` }}
      >
        {/* Header bar */}
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between"
          style={{
            background: `${C.pink}08`,
            borderBottom: `1px solid ${C.pink}20`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{
                clipPath: polyXs,
                background: `${C.pink}15`,
                border: `1px solid ${C.pink}40`,
                color: C.pink,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <p
                className="font-mono text-[8px] uppercase tracking-[0.2em]"
                style={{ color: `${C.pink}70` }}
              >
                TRANSMIT_01
              </p>
              <h3
                className="text-sm font-bold uppercase tracking-tight text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Photo
              </h3>
            </div>
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: `${C.pink}60` }}
          >
            → frame
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {preview ? (
            <>
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: "16/9", clipPath: polySm }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.src}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  style={{ filter: "grayscale(0.3) contrast(1.1)" }}
                />
                <div
                  className="absolute bottom-2 right-2 font-mono text-[8px] uppercase px-2 py-1"
                  style={{
                    clipPath: polyXs,
                    background: `${C.pink}25`,
                    border: `1px solid ${C.pink}50`,
                    color: C.pink,
                  }}
                >
                  B/W on send
                </div>
              </div>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption... (optional)"
                className="w-full font-mono text-xs px-3 py-2 outline-none"
                style={{
                  clipPath: polyXs,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "#fff",
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={send}
                  disabled={uploading}
                  className="flex-1 py-2.5 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50"
                  style={{
                    clipPath: polySm,
                    background: `${C.pink}15`,
                    border: `1.5px solid ${C.pink}`,
                    color: C.pink,
                  }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = C.pink;
                    b.style.color = "#07070f";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = `${C.pink}15`;
                    b.style.color = C.pink;
                  }}
                >
                  {uploading ? "Sending..." : "Send to frame //"}
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    setCaption("");
                  }}
                  className="px-3 font-mono text-[10px] uppercase tracking-widest"
                  style={{
                    clipPath: polyXs,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  ✕
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex flex-col items-center justify-center gap-2 relative overflow-hidden cursor-pointer transition-all"
                style={{
                  minHeight: 110,
                  border: `2px dashed ${C.pink}30`,
                  background: `${C.pink}04`,
                  clipPath: polySm,
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    C.pink;
                }}
                onDragLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    `${C.pink}30`;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 10px, ${C.pink}04 10px, ${C.pink}04 11px)`,
                  }}
                />
                <div
                  className="w-9 h-9 flex items-center justify-center z-10"
                  style={{
                    clipPath: polyXs,
                    background: `${C.pink}10`,
                    border: `1.5px solid ${C.pink}40`,
                    color: C.pink,
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </div>
                <p
                  className="font-mono text-[9px] uppercase tracking-widest z-10"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Drop or click to upload
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
                style={{
                  clipPath: polyXs,
                  border: `1px solid ${C.pink}25`,
                  background: `${C.pink}06`,
                  color: `${C.pink}aa`,
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.borderColor = C.pink;
                  b.style.color = C.pink;
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.borderColor = `${C.pink}25`;
                  b.style.color = `${C.pink}aa`;
                }}
              >
                Browse files //
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function MessageWidget() {
  const { sendMessage } = useUser();
  const modal = useModal();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const maxLen = 280;

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(text.trim());
      setText("");
      modal.open({
        ...ModalPresets.transmitSuccess(),
        actions: [{ label: "Done", variant: "primary", onClick: modal.close }],
      });
    } catch (err) {
      modal.open({
        ...ModalPresets.transmitError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
        ],
      });
    } finally {
      setSending(false);
    }
  }

  const pct = text.length / maxLen;
  const ringColor = pct > 0.9 ? C.pink : pct > 0.7 ? "#f5a623" : C.cyan;

  return (
    <>
      {modal.Modal}
      <div
        className="relative overflow-hidden"
        style={{
          clipPath: polyRev,
          border: `1px solid rgba(255,255,255,0.07)`,
        }}
      >
        {/* Header bar */}
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between"
          style={{
            background: `${C.cyan}08`,
            borderBottom: `1px solid ${C.cyan}20`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{
                clipPath: polyXs,
                background: `${C.cyan}15`,
                border: `1px solid ${C.cyan}40`,
                color: C.cyan,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p
                className="font-mono text-[8px] uppercase tracking-[0.2em]"
                style={{ color: `${C.cyan}70` }}
              >
                TRANSMIT_02
              </p>
              <h3
                className="text-sm font-bold uppercase tracking-tight text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Love letter
              </h3>
            </div>
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: `${C.cyan}60` }}
          >
            → frame
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLen))}
              placeholder="Write something for their frame..."
              className="w-full resize-none outline-none font-mono text-xs leading-relaxed px-3 py-2.5"
              style={{
                clipPath: polySm,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff",
              }}
            />
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
              <span
                className="font-mono text-[9px]"
                style={{ color: `${ringColor}cc` }}
              >
                {maxLen - text.length}
              </span>
              <svg width="14" height="14" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="3"
                  strokeDasharray={`${pct * 87.96} 87.96`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: "stroke-dasharray 0.2s, stroke 0.2s" }}
                />
              </svg>
            </div>
          </div>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-full py-2.5 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-40"
            style={{
              clipPath: polySm,
              background: `${C.cyan}12`,
              border: `1.5px solid ${C.cyan}`,
              color: C.cyan,
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = C.cyan;
              b.style.color = "#07070f";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = `${C.cyan}12`;
              b.style.color = C.cyan;
            }}
          >
            {sending ? "Sending..." : "Send to frame //"}
          </button>
        </div>
      </div>
    </>
  );
}

function DrawWidget() {
  const { uploadContent } = useUser();
  const modal = useModal();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [size, setSize] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e)
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : "#000000";
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasStrokes(true);
  }
  function endDraw() {
    drawing.current = false;
    lastPos.current = null;
  }
  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  async function send() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploading(true);
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(
          (b) => (b ? res(b) : rej(new Error("canvas empty"))),
          "image/png",
        ),
      );
      const file = new File([blob], "drawing.png", { type: "image/png" });
      await uploadContent(file, "drawing");
      clear();
      modal.open({
        ...ModalPresets.transmitSuccess(),
        actions: [{ label: "Done", variant: "primary", onClick: modal.close }],
      });
    } catch (err) {
      modal.open({
        ...ModalPresets.transmitError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
        ],
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative overflow-hidden"
        style={{ clipPath: poly, border: `1px solid rgba(255,255,255,0.07)` }}
      >
        {/* Header bar */}
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between"
          style={{
            background: `${C.purple}08`,
            borderBottom: `1px solid ${C.purple}20`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{
                clipPath: polyXs,
                background: `${C.purple}15`,
                border: `1px solid ${C.purple}40`,
                color: C.purple,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <p
                className="font-mono text-[8px] uppercase tracking-[0.2em]"
                style={{ color: `${C.purple}70` }}
              >
                TRANSMIT_03
              </p>
              <h3
                className="text-sm font-bold uppercase tracking-tight text-white"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Draw
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["pen", "eraser"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className="px-2 py-1 font-mono text-[8px] uppercase tracking-widest transition-all"
                style={{
                  clipPath: polyXs,
                  border: `1px solid ${tool === t ? C.purple : "rgba(255,255,255,0.1)"}`,
                  background: tool === t ? `${C.purple}20` : "transparent",
                  color: tool === t ? C.purple : "rgba(255,255,255,0.3)",
                }}
              >
                {t === "pen" ? "✏" : "⬜"}
              </button>
            ))}
            <input
              type="range"
              min={1}
              max={12}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-14 accent-purple-500"
            />
            <button
              onClick={clear}
              className="font-mono text-[8px] uppercase px-2 py-1 transition-all"
              style={{
                clipPath: polyXs,
                border: "1px solid rgba(255,42,109,0.3)",
                background: "transparent",
                color: "rgba(255,42,109,0.6)",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = C.pink;
                b.style.borderColor = C.pink;
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "rgba(255,42,109,0.6)";
                b.style.borderColor = "rgba(255,42,109,0.3)";
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
          <div
            style={{
              clipPath: polySm,
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
              cursor: tool === "eraser" ? "cell" : "crosshair",
            }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={480}
              className="w-full touch-none select-none block"
              style={{ background: "#fff", display: "block" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex items-center justify-between">
            <p
              className="font-mono text-[9px] uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              800×480 · B/W on frame
            </p>
            <button
              onClick={send}
              disabled={!hasStrokes || uploading}
              className="px-5 py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-40"
              style={{
                clipPath: polySm,
                background: `${C.purple}12`,
                border: `1.5px solid ${C.purple}`,
                color: C.purple,
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = C.purple;
                b.style.color = "#07070f";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = `${C.purple}12`;
                b.style.color = C.purple;
              }}
            >
              {uploading ? "Sending..." : "Send drawing //"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── QUEUE PANEL ──────────────────────────────────────────────────────────────

function QueuePanel() {
  const { content, user, deleteContent } = useUser();
  const items = content.filter((c) => c.status !== "archived");

  async function del(id: string) {
    try {
      await deleteContent(id);
    } catch {
      /* non-fatal */
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 gap-2"
        style={{
          border: "1px dashed rgba(255,255,255,0.06)",
          clipPath: polySm,
        }}
      >
        <span
          className="font-mono text-[9px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.12)" }}
        >
          Nothing queued
        </span>
        <span
          className="font-mono text-[8px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.07)" }}
        >
          Send a photo, message, or drawing above
        </span>
      </div>
    );
  }

  const typeIcon: Record<string, React.ReactNode> = {
    photo: (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    message: (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    drawing: (
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  };

  return (
    <div
      className="flex flex-col divide-y"
      style={{
        borderColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        clipPath: polySm,
      }}
    >
      {items.map((c) => {
        const isDisplayed = c.status === "displayed";
        const isQueued = c.status === "queued";
        const canDelete = c.sent_by === user?.id && isQueued;
        const statusColor = isDisplayed
          ? C.cyan
          : isQueued
            ? C.purple
            : "rgba(255,255,255,0.2)";
        const statusText = isDisplayed
          ? "On frame"
          : isQueued
            ? "Queued"
            : "Sent";
        return (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 group relative transition-all"
            style={{ background: isDisplayed ? `${C.cyan}04` : "transparent" }}
          >
            {isDisplayed && (
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5"
                style={{ background: C.cyan }}
              />
            )}
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{
                clipPath: polyXs,
                background: `${statusColor}10`,
                border: `1px solid ${statusColor}25`,
                color: statusColor,
              }}
            >
              {typeIcon[c.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: statusColor }}
                >
                  {statusText}
                </span>
                <span
                  className="font-mono text-[8px] uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  · {c.type}
                </span>
              </div>
              <p
                className="font-mono text-[10px] truncate"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {c.message_text ??
                  c.caption ??
                  (c.type === "photo"
                    ? "Photo"
                    : c.type === "drawing"
                      ? "Drawing"
                      : "—")}
              </p>
            </div>
            <span
              className="font-mono text-[9px] flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              {timeAgo(c.created_at)}
            </span>
            {canDelete && (
              <button
                onClick={() => del(c.id)}
                className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{
                  clipPath: polyXs,
                  background: `${C.pink}cc`,
                  color: "#fff",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SCREEN MANAGER ───────────────────────────────────────────────────────────

function ScreenManagerWidget({
  screens,
  onChange,
}: {
  screens: { id: string }[];
  onChange: (screens: { id: string }[]) => void;
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
    <div
      className="relative overflow-hidden"
      style={{ clipPath: poly, border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center"
            style={{
              clipPath: polyXs,
              background: `${C.cyan}12`,
              border: `1px solid ${C.cyan}30`,
              color: C.cyan,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              FRAME_CONFIG
            </p>
            <h3
              className="text-sm font-bold uppercase tracking-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Screen Layout
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[9px] uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            swipe order
          </span>
          <Pill
            color={C.cyan}
            text={`${screens.length} screen${screens.length !== 1 ? "s" : ""}`}
          />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Active screens — drag to reorder */}
        <div>
          <p
            className="font-mono text-[9px] uppercase tracking-[0.2em] mb-3"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Active · drag to set order
          </p>
          <div className="flex flex-col gap-2">
            {screens.map((s, i) => {
              const meta = ALL_SCREENS.find((m) => m.id === s.id);
              const isHome = i === 0;
              const accentColor = isHome ? C.cyan : C.purple;
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
                  className="flex items-center gap-3 px-3 py-2.5 group cursor-grab transition-all"
                  style={{
                    clipPath: polyXs,
                    background:
                      over === i
                        ? `${accentColor}10`
                        : isHome
                          ? `${C.cyan}06`
                          : "rgba(255,255,255,0.02)",
                    border: `1px solid ${over === i ? accentColor : isHome ? `${C.cyan}25` : "rgba(255,255,255,0.07)"}`,
                    opacity: dragging === i ? 0.3 : 1,
                    transition: "all 0.12s",
                  }}
                >
                  {/* Drag handle */}
                  <span
                    className="font-mono text-[11px] select-none shrink-0"
                    style={{ color: "rgba(255,255,255,0.15)" }}
                  >
                    ⣿
                  </span>

                  {/* Position badge */}
                  <div
                    className="w-6 h-6 flex items-center justify-center shrink-0 font-mono text-[9px] font-bold"
                    style={{
                      clipPath: polyXs,
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}40`,
                      color: accentColor,
                    }}
                  >
                    {isHome ? "⌂" : i + 1}
                  </div>

                  {/* Emoji */}
                  <span className="text-base shrink-0">{meta?.emoji}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-mono text-xs font-bold uppercase tracking-tight"
                        style={{
                          color: isHome ? C.cyan : "rgba(255,255,255,0.75)",
                        }}
                      >
                        {meta?.label}
                      </span>
                      {meta?.locked && (
                        <span
                          className="font-mono text-[8px] uppercase"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        >
                          [locked]
                        </span>
                      )}
                    </div>
                    <span
                      className="font-mono text-[9px]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {meta?.desc}
                    </span>
                  </div>

                  {/* Home/number pill */}
                  <Pill
                    color={isHome ? C.cyan : "rgba(255,255,255,0.15)"}
                    text={isHome ? "Home" : `#${i + 1}`}
                  />

                  {/* Remove btn */}
                  {!meta?.locked && (
                    <button
                      onClick={() => toggle(s.id)}
                      className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{
                        clipPath: polyXs,
                        background: `${C.pink}20`,
                        border: `1px solid ${C.pink}40`,
                        color: C.pink,
                      }}
                    >
                      <svg
                        width="7"
                        height="7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add inactive screens */}
        {inactive.length > 0 && (
          <div>
            <p
              className="font-mono text-[9px] uppercase tracking-[0.2em] mb-3"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Add screens
            </p>
            <div className="flex flex-wrap gap-2">
              {inactive.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className="flex items-center gap-2 px-3 py-2 transition-all"
                  style={{
                    clipPath: polyXs,
                    border: `1px dashed rgba(255,255,255,0.12)`,
                    background: "transparent",
                    color: "rgba(255,255,255,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = C.cyan;
                    b.style.color = C.cyan;
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(255,255,255,0.12)";
                    b.style.color = "rgba(255,255,255,0.3)";
                  }}
                >
                  <span className="text-sm">{s.emoji}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest">
                    + {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── TAMAGOTCHI WIDGET ────────────────────────────────────────────────────────

function TamagotchiWidget() {
  const [cfg, setCfg] = useState(DEFAULT_TAMA_CONFIG);

  useEffect(() => {
    setCfg(loadTamaConfig());
  }, []);
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === TAMA_STORAGE_KEY) setCfg(loadTamaConfig());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const charReg = CHAR_REGISTRY[cfg.species];
  const animCss = ANIM_CSS[cfg.animation] ?? ANIM_CSS.idle;

  return (
    <div
      className="relative overflow-hidden"
      style={{ clipPath: polyRev, border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "800/480", background: "#060610" }}
      >
        <div className="absolute inset-0">
          <PixelBg type={cfg.background} scale={5} fillParent />
        </div>
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.6) 100%)",
          }}
        />
        {[
          {
            top: 4,
            left: 4,
            borderTop: `1px solid ${C.cyan}50`,
            borderLeft: `1px solid ${C.cyan}50`,
          },
          {
            top: 4,
            right: 4,
            borderTop: `1px solid ${C.cyan}50`,
            borderRight: `1px solid ${C.cyan}50`,
          },
          {
            bottom: 4,
            left: 4,
            borderBottom: `1px solid ${C.cyan}50`,
            borderLeft: `1px solid ${C.cyan}50`,
          },
          {
            bottom: 4,
            right: 4,
            borderBottom: `1px solid ${C.cyan}50`,
            borderRight: `1px solid ${C.cyan}50`,
          },
        ].map((s, i) => (
          <div
            key={i}
            className="absolute w-2.5 h-2.5 pointer-events-none z-20"
            style={s}
          />
        ))}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{ animation: animCss }}
        >
          <div style={{ filter: `drop-shadow(0 0 8px ${C.cyan}40)` }}>
            {charReg ? (
              <AnimatedSprite
                frames={charReg.idle}
                palette={charReg.palette}
                scale={5}
                fps={3}
                outfit={cfg.outfit}
                accessory={cfg.accessory}
              />
            ) : (
              <span style={{ fontSize: "1.5rem", color: C.cyan }}>
                {cfg.species}
              </span>
            )}
          </div>
        </div>
        <div
          className="absolute bottom-1 left-2 font-mono leading-none z-30"
          style={{ fontSize: "0.45rem", color: `${C.cyan}70` }}
        >
          ❤ 87 · ⚡ 64 · LVL 7
        </div>
        <div
          className="absolute top-1.5 right-2 font-mono leading-none z-30"
          style={{ fontSize: "0.42rem", color: `${C.purple}80` }}
        >
          {cfg.animation.toUpperCase()}
        </div>
      </div>
      <div
        className="px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Companion · on your frame
            </p>
            <p
              className="font-bold uppercase tracking-tight leading-tight mt-0.5"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {charReg ? charReg.name : cfg.species} · {cfg.animation}
            </p>
          </div>
          <Link
            href="/dashboard/tamagotchi"
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest px-2.5 py-1.5 transition-all"
            style={{
              clipPath: polyXs,
              border: `1px solid ${C.purple}40`,
              background: `${C.purple}0c`,
              color: `${C.purple}cc`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = C.purple;
              el.style.color = C.purple;
              el.style.background = `${C.purple}20`;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = `${C.purple}40`;
              el.style.color = `${C.purple}cc`;
              el.style.background = `${C.purple}0c`;
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Studio
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          {[
            {
              label: "Health",
              val: 72,
              color: `linear-gradient(90deg,${C.cyan},${C.purple})`,
            },
            {
              label: "XP",
              val: 45,
              color: `linear-gradient(90deg,${C.purple},${C.pink})`,
            },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex justify-between mb-0.5">
                <span
                  className="font-mono text-[7px] uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                >
                  {s.label}
                </span>
                <span
                  className="font-mono text-[7px]"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {s.val}%
                </span>
              </div>
              <div
                className="h-0.5 relative"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-500"
                  style={{ width: `${s.val}%`, background: s.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <p
          className="font-mono text-[7px] uppercase tracking-widest mt-2 pt-2"
          style={{
            color: "rgba(255,255,255,0.1)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          ↺ Partner content keeps them alive
        </p>
      </div>
      <style>{`
        @keyframes tamaBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        @keyframes tamaBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-14%)}}
        @keyframes tamaSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes tamaWave{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
        @keyframes tamaDance{0%,100%{transform:translateX(-8%) rotate(-6deg)}50%{transform:translateX(8%) rotate(6deg)}}
        @keyframes tamaSleep{0%,100%{transform:scale(1) rotate(-4deg);opacity:.75}50%{transform:scale(.95) rotate(4deg);opacity:1}}
        @keyframes tamaHyper{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-18%) scale(1.12)}75%{transform:translateY(-9%) scale(1.06)}}
        @keyframes tamaFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12%)}}
      `}</style>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { couple, device, isLoading, error, refetch } = useUser();
  const [screens, setScreens] = useState(DEFAULT_SCREENS);

  useEffect(() => {
    setScreens(loadScreens());
  }, []);

  function handleScreensChange(next: { id: string }[]) {
    setScreens(next);
    try {
      localStorage.setItem(SCREENS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    if (!couple || couple.status === "active") return;
    const id = setInterval(() => refetch(), 5000);
    return () => clearInterval(id);
  }, [couple?.status, couple, refetch]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
          <Spinner />
          <p
            className="font-mono text-[10px] uppercase tracking-widest"
            style={{ color: C.cyan }}
          >
            &gt; Accessing matrix...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div
          className="p-6 m-8 font-mono text-sm uppercase"
          style={{
            background: `${C.pink}08`,
            border: `1px solid ${C.pink}35`,
            color: C.pink,
            clipPath: polySm,
          }}
        >
          &gt; FATAL: {error}
        </div>
      </AppLayout>
    );
  }

  const coupleActive = couple?.status === "active";
  const couplePending = couple?.status === "pending";
  const noCouple = !couple;
  const setupNeeded = !device || noCouple || couplePending;

  return (
    <AppLayout>
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {setupNeeded && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-px w-6"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-[0.3em]"
                style={{ color: "rgba(255,200,0,0.6)" }}
              >
                Setup required
              </span>
              <div
                className="h-px flex-1"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!device && <PairFrameSetup onPaired={() => refetch()} />}
              {(noCouple || couplePending) && (
                <PartnerSetup onLinked={() => refetch()} />
              )}
            </div>
          </section>
        )}

        {couplePending && device && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Spinner />
            <p
              className="font-bold uppercase text-lg"
              style={{
                fontFamily: "'Syne', sans-serif",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              Waiting for partner...
            </p>
            <p
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: `${C.purple}50` }}
            >
              Share the invite link above
            </p>
          </div>
        )}

        {coupleActive && (
          <>
            <div className="mb-6">
              <FrameStatusBar />
            </div>

            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: "1fr 1fr 280px" }}
            >
              <div className="flex flex-col gap-5">
                <PhotoWidget />
                <ScreenManagerWidget
                  screens={screens}
                  onChange={handleScreensChange}
                />
              </div>

              {/* COL 2 — Message + Draw + Screen Manager */}
              <div className="flex flex-col gap-5">
                <MessageWidget />
                <DrawWidget />
              </div>

              {/* COL 3 — Tamagotchi sidebar */}
              <div className="flex flex-col gap-4">
                <TamagotchiWidget />
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
