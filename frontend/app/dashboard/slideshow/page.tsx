"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SlideshowProvider,
  useSlideshowContext,
} from "@/providers/SlideshowProvider";
import type { Slideshow, SlideshowMode, SlideshowSlide } from "@/api/slideshow";
import {
  Film,
  Camera,
  Settings,
  AlertTriangle,
  X,
  ImagePlus,
  Images,
  Pencil,
  Trash2,
  Play,
  Shuffle,
  Dices,
  Repeat1,
  Heart,
  Smile,
  Laugh,
  Frown,
  ThumbsUp,
  Flame,
  Sparkles,
  HeartHandshake,
  Check,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";

// ─── Design tokens (matches app cyberpunk palette) ────────────────────────────
const C = {
  bg: "#07070f",
  card: "#0d0d1a",
  border: "#1a1a2e",
  cyan: "#05d9e8",
  purple: "#b122e5",
  pink: "#ff2a6d",
  yellow: "#f5d300",
  white: "#e8e8ff",
  dim: "#4a4a6a",
};

const clip =
  "polygon(12px 0%,100% 0%,100% calc(100%-12px),calc(100%-12px) 100%,0% 100%,0% 12px)";
const clipS =
  "polygon(8px 0%,100% 0%,100% calc(100%-8px),calc(100%-8px) 100%,0% 100%,0% 8px)";
const clipXs =
  "polygon(5px 0%,100% 0%,100% calc(100%-5px),calc(100%-5px) 100%,0% 100%,0% 5px)";

const REACT_EMOJIS = ["❤️", "😍", "😂", "😢", "👏", "🔥", "💫", "🥰"];

const REACTION_MAP: Record<string, React.ReactNode> = {
  "❤️": <Heart size={14} />,
  "😍": <Smile size={14} />,
  "😂": <Laugh size={14} />,
  "😢": <Frown size={14} />,
  "👏": <ThumbsUp size={14} />,
  "🔥": <Flame size={14} />,
  "💫": <Sparkles size={14} />,
  "🥰": <HeartHandshake size={14} />,
};

const MODE_META: Record<
  SlideshowMode,
  { label: string; icon: React.ReactNode; desc: string }
> = {
  sequential: {
    label: "Sequential",
    icon: <Play size={18} />,
    desc: "Plays photos in order, 1 → 2 → 3 …",
  },
  shuffle: {
    label: "Shuffle",
    icon: <Shuffle size={18} />,
    desc: "Random order, no repeats until all shown",
  },
  random: {
    label: "Random",
    icon: <Dices size={18} />,
    desc: "Fully random picks, any can repeat",
  },
  "loop-one": {
    label: "Loop One",
    icon: <Repeat1 size={18} />,
    desc: "Stays on the current slide",
  },
};

function fmtDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${ms / 1000}s`;
  return `${Math.round(ms / 60000)}m`;
}

// ─── Root page ─────────────────────────────────────────────────────────────────
export default function SlideshowPage() {
  return (
    <SlideshowProvider>
      <SlideshowScreen />
    </SlideshowProvider>
  );
}

// ─── Inner screen (has access to context) ─────────────────────────────────────
function SlideshowScreen() {
  const { slideshow, loading, error, clearError } = useSlideshowContext();
  const [tab, setTab] = useState<"slides" | "settings">("slides");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Mono', 'Courier New', monospace",
        color: C.white,
        padding: "0",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          borderBottom: `1px solid ${C.border}`,
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: `${C.card}cc`,
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ color: C.cyan, display: "flex" }}>
          <Film size={24} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 16,
              letterSpacing: "0.12em",
              color: C.cyan,
            }}
          >
            SLIDESHOW
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: C.dim,
              letterSpacing: "0.08em",
            }}
          >
            {slideshow
              ? `${slideshow.slides.length} photo${slideshow.slides.length !== 1 ? "s" : ""} · ${slideshow.name}`
              : "Configure your partner's frame slideshow"}
          </p>
        </div>

        {slideshow && (
          <div style={{ marginLeft: "auto" }}>
            <ActiveToggle />
          </div>
        )}
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div
          style={{
            margin: "16px 28px 0",
            padding: "12px 16px",
            background: `${C.pink}18`,
            border: `1px solid ${C.pink}66`,
            clipPath: clipS,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: C.pink,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} /> {error}
          </span>
          <button
            onClick={clearError}
            style={{
              background: "none",
              border: "none",
              color: C.pink,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: "20px 28px 0", display: "flex", gap: 4 }}>
        {(["slides", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: tab === t ? `${C.cyan}18` : "transparent",
              border: `1px solid ${tab === t ? C.cyan : C.border}`,
              color: tab === t ? C.cyan : C.dim,
              padding: "8px 20px",
              clipPath: clipXs,
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            {t === "slides" ? <Camera size={14} /> : <Settings size={14} />}
            <span>{t === "slides" ? "Slides" : "Settings"}</span>
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <main style={{ padding: "20px 28px 60px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              paddingTop: 80,
              color: C.dim,
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Loader2
              size={32}
              className="animate-spin"
              style={{ marginBottom: 12, color: C.cyan }}
            />
            LOADING...
          </div>
        ) : tab === "slides" ? (
          <SlidesTab />
        ) : (
          <SettingsTab />
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 8px ${C.cyan}66; } 50% { box-shadow: 0 0 20px ${C.cyan}; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}

// ─── Active toggle ─────────────────────────────────────────────────────────────
function ActiveToggle() {
  const { slideshow, toggleActive } = useSlideshowContext();
  const [busy, setBusy] = useState(false);
  if (!slideshow) return null;

  const active = slideshow.is_active;

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await toggleActive(!active).finally(() => setBusy(false));
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        clipPath: clipXs,
        background: active ? `${C.cyan}18` : `${C.border}88`,
        border: `1px solid ${active ? C.cyan : C.dim}`,
        color: active ? C.cyan : C.dim,
        cursor: "pointer",
        fontSize: 11,
        letterSpacing: "0.1em",
        animation: active ? "glow 2.5s ease-in-out infinite" : "none",
        transition: "all 0.2s",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? C.cyan : C.dim,
          animation: active ? "spin 2s linear infinite" : "none",
          boxShadow: active ? `0 0 6px ${C.cyan}` : "none",
          flexShrink: 0,
        }}
      />
      {active ? "LIVE ON FRAME" : "ACTIVATE"}
    </button>
  );
}

// ─── Slides tab ───────────────────────────────────────────────────────────────
function SlidesTab() {
  const { slideshow, uploads, uploadPhotos, reorder, removeSlide } =
    useSlideshowContext();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropHover, setDropHover] = useState(false);

  const slides = slideshow?.slides ?? [];

  // ── File drop zone ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropHover(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) uploadPhotos(files);
    },
    [uploadPhotos],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) uploadPhotos(files);
      e.target.value = "";
    },
    [uploadPhotos],
  );

  // ── Drag-to-reorder ──
  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDragEnd = async () => {
    if (draggingId && dragOverId && draggingId !== dragOverId) {
      const ids = slides.map((s) => s.id);
      const fromIdx = ids.indexOf(draggingId);
      const toIdx = ids.indexOf(dragOverId);
      const newIds = [...ids];
      newIds.splice(fromIdx, 1);
      newIds.splice(toIdx, 0, draggingId);
      await reorder(newIds);
    }
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDropHover(true);
        }}
        onDragLeave={() => setDropHover(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dropHover ? C.cyan : C.border}`,
          borderRadius: 2,
          padding: "32px 24px",
          textAlign: "center",
          background: dropHover ? `${C.cyan}0a` : "transparent",
          transition: "all 0.2s",
          cursor: "pointer",
          animation: dropHover ? "glow 1s ease-in-out infinite" : "none",
        }}
        onClick={() => document.getElementById("slideFileInput")?.click()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 8,
            color: dropHover ? C.cyan : C.dim,
          }}
        >
          <ImagePlus size={36} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: dropHover ? C.cyan : C.dim,
            letterSpacing: "0.08em",
          }}
        >
          {dropHover
            ? "DROP TO ADD"
            : "DRAG & DROP PHOTOS  ·  OR CLICK TO BROWSE"}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 10, color: C.dim }}>
          JPG · PNG · WEBP · max 20 MB each
        </p>
        <input
          id="slideFileInput"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {uploads.map((u, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                clipPath: clipXs,
                padding: "10px 14px",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: C.dim,
                }}
              >
                {u.file.name}
              </span>
              {u.error ? (
                <span
                  style={{
                    color: C.pink,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertTriangle size={12} /> {u.error}
                </span>
              ) : (
                <div
                  style={{
                    width: 100,
                    height: 4,
                    background: C.border,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: `${u.progress}%`,
                      height: "100%",
                      background: C.cyan,
                      borderRadius: 2,
                      transition: "width 0.15s",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No slides empty state */}
      {slides.length === 0 && uploads.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: C.dim,
            fontSize: 12,
            letterSpacing: "0.08em",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Images size={48} />
          </div>
          <p>No slides yet. Upload photos to begin.</p>
        </div>
      )}

      {/* Slide grid */}
      {slides.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10,
              color: C.dim,
              letterSpacing: "0.1em",
            }}
          >
            <span>SLIDES ({slides.length}) · DRAG TO REORDER</span>
            {slideshow && <span>CURRENT: #{slideshow.current_index + 1}</span>}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {slides.map((slide, idx) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={idx}
                isCurrent={slideshow?.current_index === idx}
                isDragging={draggingId === slide.id}
                isDragOver={dragOverId === slide.id}
                isEditing={editingId === slide.id}
                onEdit={() =>
                  setEditingId(editingId === slide.id ? null : slide.id)
                }
                onDelete={() => removeSlide(slide.id)}
                onDragStart={() => handleDragStart(slide.id)}
                onDragOver={(e) => handleDragOver(e, slide.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Slide card ───────────────────────────────────────────────────────────────
function SlideCard({
  slide,
  index,
  isCurrent,
  isDragging,
  isDragOver,
  isEditing,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  slide: SlideshowSlide;
  index: number;
  isCurrent: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const { editSlide, react, unreact } = useSlideshowContext();
  const [captionDraft, setCaptionDraft] = useState(slide.caption ?? "");
  const [savingCaption, setSavingCaption] = useState(false);

  const saveCaption = async () => {
    setSavingCaption(true);
    await editSlide(slide.id, { caption: captionDraft || undefined });
    setSavingCaption(false);
    onEdit();
  };

  const accentColor = isCurrent ? C.cyan : isDragOver ? C.yellow : C.border;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{
        background: C.card,
        border: `1px solid ${accentColor}`,
        clipPath: clip,
        opacity: isDragging ? 0.4 : 1,
        transform: isDragOver ? "scale(1.02)" : "scale(1)",
        transition: "all 0.15s",
        cursor: "grab",
        animation: "fadeIn 0.2s ease",
        position: "relative",
      }}
    >
      {/* Current indicator */}
      {isCurrent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
            zIndex: 2,
          }}
        />
      )}

      {/* Image */}
      <div
        style={{ position: "relative", paddingTop: "75%", overflow: "hidden" }}
      >
        <img
          src={slide.image_url}
          alt={slide.caption ?? `Slide ${index + 1}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        {/* Position badge */}
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            background: `${C.bg}cc`,
            border: `1px solid ${C.border}`,
            padding: "2px 6px",
            fontSize: 9,
            letterSpacing: "0.08em",
            color: isCurrent ? C.cyan : C.dim,
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Duration override badge */}
        {slide.duration_ms && (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: `${C.purple}cc`,
              padding: "2px 6px",
              fontSize: 9,
              letterSpacing: "0.06em",
              color: C.white,
            }}
          >
            {fmtDuration(slide.duration_ms)}
          </span>
        )}

        {/* Reaction badge */}
        {(slide.reaction_count > 0 || slide.my_reaction) && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: `${C.bg}cc`,
              border: `1px solid ${C.border}`,
              padding: "4px 8px",
              borderRadius: 4,
              color: C.pink,
            }}
          >
            {REACTION_MAP[slide.my_reaction || "❤️"] || <Heart size={14} />}
            {slide.reaction_count > 1 && (
              <span style={{ fontSize: 10, color: C.white, fontWeight: 500 }}>
                {slide.reaction_count}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Caption */}
      {slide.caption && !isEditing && (
        <div
          style={{
            padding: "8px 10px",
            fontSize: 10,
            color: C.dim,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {slide.caption}
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div style={{ padding: "10px", borderTop: `1px solid ${C.border}` }}>
          <input
            value={captionDraft}
            onChange={(e) => setCaptionDraft(e.target.value)}
            placeholder="Add caption..."
            maxLength={80}
            style={{
              width: "100%",
              background: C.bg,
              border: `1px solid ${C.cyan}44`,
              color: C.white,
              padding: "6px 8px",
              fontSize: 10,
              fontFamily: "inherit",
              outline: "none",
              marginBottom: 6,
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <Btn
              small
              onClick={saveCaption}
              color={C.cyan}
              disabled={savingCaption}
            >
              {savingCaption ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Loader2 size={12} className="animate-spin" />
                </span>
              ) : (
                "SAVE"
              )}
            </Btn>
            <Btn small onClick={onEdit} color={C.dim}>
              CANCEL
            </Btn>
          </div>

          {/* Reaction picker */}
          <div style={{ marginTop: 8 }}>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 9,
                color: C.dim,
                letterSpacing: "0.08em",
              }}
            >
              PARTNER'S REACTION
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {REACT_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() =>
                    slide.my_reaction === e
                      ? unreact(slide.id)
                      : react(slide.id, e)
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      slide.my_reaction === e ? `${C.cyan}22` : "transparent",
                    border: `1px solid ${slide.my_reaction === e ? C.cyan : C.border}`,
                    borderRadius: 4,
                    padding: "4px",
                    cursor: "pointer",
                    color: slide.my_reaction === e ? C.cyan : C.white,
                    transition: "all 0.15s",
                  }}
                  title={slide.my_reaction === e ? "Remove reaction" : "React"}
                >
                  {REACTION_MAP[e] || <Heart size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          padding: "6px 8px",
          gap: 4,
        }}
      >
        <ActionBtn onClick={onEdit} title="Edit caption">
          <Pencil size={14} />
        </ActionBtn>
        <ActionBtn onClick={onDelete} title="Remove slide" danger>
          <Trash2 size={14} />
        </ActionBtn>
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { slideshow, saveSettings } = useSlideshowContext();

  const [form, setForm] = useState({
    name: slideshow?.name ?? "My Slideshow",
    mode: slideshow?.mode ?? ("sequential" as SlideshowMode),
    slide_duration_ms: slideshow?.slide_duration_ms ?? 8000,
    transition_ms: slideshow?.transition_ms ?? 500,
    repeat: slideshow?.repeat ?? true,
    show_caption: slideshow?.show_caption ?? true,
    show_date: slideshow?.show_date ?? false,
    show_progress: slideshow?.show_progress ?? true,
    manual_advance: slideshow?.manual_advance ?? false,
    night_mode: slideshow?.night_mode ?? false,
    night_start: slideshow?.night_start ?? 22,
    night_end: slideshow?.night_end ?? 7,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (slideshow) {
      setForm({
        name: slideshow.name,
        mode: slideshow.mode,
        slide_duration_ms: slideshow.slide_duration_ms,
        transition_ms: slideshow.transition_ms,
        repeat: slideshow.repeat,
        show_caption: slideshow.show_caption,
        show_date: slideshow.show_date,
        show_progress: slideshow.show_progress,
        manual_advance: slideshow.manual_advance,
        night_mode: slideshow.night_mode,
        night_start: slideshow.night_start,
        night_end: slideshow.night_end,
      });
    }
  }, [slideshow]);

  const set = (k: string, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Name */}
      <Section title="IDENTITY">
        <FieldRow label="SLIDESHOW NAME">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            maxLength={60}
            style={inputStyle}
          />
        </FieldRow>
      </Section>

      {/* Mode */}
      <Section title="PLAYBACK MODE">
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          {(Object.keys(MODE_META) as SlideshowMode[]).map((m) => {
            const { label, icon, desc } = MODE_META[m];
            const active = form.mode === m;
            return (
              <button
                key={m}
                onClick={() => set("mode", m)}
                style={{
                  background: active ? `${C.cyan}14` : C.card,
                  border: `1px solid ${active ? C.cyan : C.border}`,
                  clipPath: clipXs,
                  color: active ? C.cyan : C.dim,
                  padding: "12px 14px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ marginBottom: 8, display: "flex" }}>{icon}</div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: 9, opacity: 0.6, lineHeight: 1.4 }}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Timing */}
      <Section title="TIMING">
        <FieldRow
          label={`SLIDE DURATION  ·  ${fmtDuration(form.slide_duration_ms)}`}
        >
          <input
            type="range"
            min={1000}
            max={60000}
            step={500}
            value={form.slide_duration_ms}
            onChange={(e) => set("slide_duration_ms", Number(e.target.value))}
            style={rangeStyle}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[3000, 5000, 8000, 15000, 30000].map((v) => (
              <Btn
                key={v}
                small
                onClick={() => set("slide_duration_ms", v)}
                color={form.slide_duration_ms === v ? C.cyan : C.dim}
              >
                {fmtDuration(v)}
              </Btn>
            ))}
          </div>
        </FieldRow>

        <FieldRow label={`TRANSITION  ·  ${fmtDuration(form.transition_ms)}`}>
          <input
            type="range"
            min={0}
            max={2000}
            step={100}
            value={form.transition_ms}
            onChange={(e) => set("transition_ms", Number(e.target.value))}
            style={rangeStyle}
          />
        </FieldRow>
      </Section>

      {/* Behaviour */}
      <Section title="BEHAVIOUR">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Toggle
            label="Loop / Repeat"
            desc="Start over after last slide"
            value={form.repeat}
            onChange={(v) => set("repeat", v)}
          />
          <Toggle
            label="Show Caption"
            desc="Overlay caption text on frame"
            value={form.show_caption}
            onChange={(v) => set("show_caption", v)}
          />
          <Toggle
            label="Show Date"
            desc="Show when photo was added"
            value={form.show_date}
            onChange={(v) => set("show_date", v)}
          />
          <Toggle
            label="Show Progress"
            desc="Dot / bar progress indicator"
            value={form.show_progress}
            onChange={(v) => set("show_progress", v)}
          />
          <Toggle
            label="Partner Controls Pace"
            desc="Frame waits for partner's reaction to advance — great for love letters"
            value={form.manual_advance}
            onChange={(v) => set("manual_advance", v)}
            accent={C.pink}
          />
        </div>
      </Section>

      {/* Night mode */}
      <Section title="NIGHT MODE">
        <Toggle
          label="Enable Night Mode"
          desc="Dims / inverts the frame display at night"
          value={form.night_mode}
          onChange={(v) => set("night_mode", v)}
          accent={C.purple}
        />
        {form.night_mode && (
          <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
            <FieldRow label="SLEEP AT (hour)">
              <NumberInput
                value={form.night_start}
                min={0}
                max={23}
                onChange={(v) => set("night_start", v)}
              />
            </FieldRow>
            <FieldRow label="WAKE AT (hour)">
              <NumberInput
                value={form.night_end}
                min={0}
                max={23}
                onChange={(v) => set("night_end", v)}
              />
            </FieldRow>
          </div>
        )}
      </Section>

      {/* Save */}
      <div>
        <Btn onClick={handleSave} disabled={saving} color={C.cyan}>
          {saving ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 size={14} className="animate-spin" /> SAVING...
            </span>
          ) : saved ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={14} /> SAVED
            </span>
          ) : (
            "SAVE SETTINGS"
          )}
        </Btn>
      </div>
    </div>
  );
}

// ─── Small UI primitives ──────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 9,
          color: C.dim,
          letterSpacing: "0.18em",
        }}
      >
        {title}
      </p>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          clipPath: clip,
          padding: "16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 9,
          color: C.dim,
          letterSpacing: "0.14em",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
  accent = C.cyan,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 12px",
        border: `1px solid ${value ? accent + "44" : C.border}`,
        background: value ? `${accent}0a` : "transparent",
        clipPath: clipXs,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: value ? accent : C.white,
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{desc}</div>
      </div>
      <div
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: value ? accent : C.border,
          position: "relative",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: value ? 17 : 3,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: C.white,
            transition: "left 0.2s",
            boxShadow: value ? `0 0 6px ${accent}` : "none",
          }}
        />
      </div>
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ ...iconBtnStyle }}
      >
        <Minus size={14} />
      </button>
      <span
        style={{
          fontSize: 16,
          fontFamily: "inherit",
          color: C.cyan,
          minWidth: 24,
          textAlign: "center",
        }}
      >
        {String(value).padStart(2, "0")}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ ...iconBtnStyle }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  color,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: `${color ?? C.cyan}18`,
        border: `1px solid ${color ?? C.cyan}`,
        color: color ?? C.cyan,
        padding: small ? "5px 10px" : "10px 20px",
        clipPath: clipXs,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: small ? 9 : 11,
        letterSpacing: "0.1em",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({
  onClick,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  title?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "transparent",
        border: `1px solid ${danger ? C.pink + "44" : C.border}`,
        color: danger ? C.pink : C.dim,
        padding: "6px 8px",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "inherit",
        clipPath: clipXs,
        flex: 1,
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.white,
  padding: "8px 12px",
  fontSize: 12,
  fontFamily: "'DM Mono', monospace",
  outline: "none",
};

const rangeStyle: React.CSSProperties = {
  width: "100%",
  accentColor: C.cyan,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  color: C.cyan,
  width: 28,
  height: 28,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
