"use client";
import { useRef, useCallback, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui"; // Keeping Spinner if it's functional, but styling around it
import { useUser } from "@/providers/UserProvider";
import { cn } from "@/lib/utils";
import type { Content } from "@/types/api";

// --- Cyberpunk Shapes ---
const polyClip = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polySmall = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ content }: { content: Content }) {
  if (content.status === "displayed")
    return (
      <span className="px-2 py-1 border border-neon-blue bg-neon-blue/10 text-neon-blue font-mono text-[9px] uppercase tracking-widest shadow-[0_0_8px_rgba(5,217,232,0.4)]" style={{ clipPath: polySmall }}>
        [ Next_Up ]
      </span>
    );
  if (content.status === "queued")
    return (
      <span className="px-2 py-1 border border-neon-purple bg-neon-purple/10 text-neon-purple font-mono text-[9px] uppercase tracking-widest" style={{ clipPath: polySmall }}>[ Queued ]
      </span>
    );
  return (
    <span className="px-2 py-1 border border-white/20 bg-black/50 text-text-muted font-mono text-[9px] uppercase tracking-widest" style={{ clipPath: polySmall }}>
      {content.displayed_at
        ? `Used // ${new Date(content.displayed_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" })}`
        : "Used"}
    </span>
  );
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

function PhotoGrid({
  items,
  myId,
  partnerName,
  onDelete,
}: {
  items: Content[];
  myId: string;
  partnerName: string;
  onDelete: (id: string) => void;
}) {
  const photos = items.filter((c) => c.type === "photo" || c.type === "drawing");

  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-white/20 bg-surface/30 p-12 text-center" style={{ clipPath: polyClip }}>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted/60 animate-pulse">
          &gt; DATA_BANK EMPTY. AWAITING UPLINK...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {photos.map((c) => {
        const fromMe = c.sent_by === myId;
        const canDelete = fromMe && c.status === "queued";

        return (
          <div
            key={c.id}
            className="group relative aspect-square bg-surface border border-white/10 hover:border-neon-blue transition-all duration-300"
            style={{ clipPath: polySmall }}
          >
            {/* Scanline overlay over images */}
            <div className="absolute inset-0 z-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none mix-blend-overlay" />

            {c.storage_key ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE}/${c.storage_key}`}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:opacity-80 sepia-[0.3] hue-rotate-[-30deg] saturate-150"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bg-dark border border-neon-blue/20">
                <div className="text-center">
                  <span className="font-mono text-[10px] text-neon-blue/50 uppercase tracking-widest block mb-1">
                    [ NO_VISUAL_DATA ]
                  </span>
                  <p className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
                    SRC: {fromMe ? "LOCAL_USER" : "REMOTE_NODE"}
                  </p>
                </div>
              </div>
            )}

            <div className="absolute top-2 left-2 z-20">
              <StatusBadge content={c} />
            </div>

            {canDelete && (
              <button
                onClick={() => onDelete(c.id)}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 bg-bg-dark/80 border border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white"
                style={{ clipPath: polySmall }}
                title="Purge Data"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            
            {/* Cyberpunk corner accents */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20 group-hover:border-neon-blue z-20 transition-colors m-2" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({ onUpload }: { onUpload: (files: FileList) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
    },
    [onUpload],
  );

  return (
    <div
      className={cn(
        "p-12 relative cursor-pointer transition-all duration-300 border-2 overflow-hidden",
        dragging ? "border-solid border-neon-pink bg-neon-pink/10 shadow-[0_0_30px_rgba(255,42,109,0.2)]" : "border-dashed border-neon-blue/40 bg-surface/30 hover:border-neon-blue hover:bg-neon-blue/5"
      )}
      style={{ clipPath: polyClip }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className={cn("w-12 h-12 flex items-center justify-center border transition-colors", dragging ? "border-neon-pink text-neon-pink" : "border-neon-blue/50 text-neon-blue")} style={{ clipPath: polySmall }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <div>
          <p className="font-display text-xl text-white uppercase tracking-widest mb-2">
            {dragging ? "INITIALIZE UPLOAD" : "DROP VISUAL DATA HERE"}
          </p>
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-[0.2em]">
            &gt; Click to browse local storage // JPG, PNG, WEBP<br/>
            &gt; Max 20MB // Auto-Dither Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhotosPage() {
  const { user, content, isLoading, uploadContent, deleteContent, couple } = useUser();
  const [uploading, setUploading] = useState(false);
  const[uploadError, setUploadError] = useState("");

  async function handleUpload(files: FileList) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await uploadContent(file, "photo");
    } catch (error) {
      const err = error as Error;
      setUploadError(err.message ?? "Transmission failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContent(id);
    } catch (error) {
      const err = error as Error;
      console.error("Delete failed:", err.message);
    }
  }

  const photos = content.filter((c) => c.type === "photo" || c.type === "drawing");
  const queued = photos.filter((c) => c.status !== "archived").length;
  const used = photos.filter((c) => c.status === "archived").length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-neon-blue font-mono text-xs uppercase tracking-widest gap-4">
          <Spinner />
          &gt; Scanning Data Archives...
        </div>
      </AppLayout>
    );
  }

  const myId = user?.id ?? "";
  const partnerName = couple?.status === "active" ? "REMOTE_NODE" : "UNKNOWN";

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-dark text-white pt-12 pb-24 relative">
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10 animate-fade-in">
          
          {/* Header */}
          <div className="mb-10 border-b border-white/10 pb-8">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-purple block animate-pulse" />
              SHARED_MEMORY_BANK
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              Visual <span className="text-neon-purple text-glow-purple italic">Archives.</span>
            </h1>
            <p className="font-mono text-xs text-text-muted mt-4 border-l-2 border-neon-purple/50 pl-3 py-1 bg-neon-purple/5 max-w-xl leading-relaxed uppercase">
              Imagery cycles through the hardware terminal diurnally.<br/>
               Upload local data to alternate sequences with remote node.
            </p>
          </div>

          {couple?.status !== "active" ? (
            <div className="bg-surface border border-red-500/50 p-6" style={{ clipPath: polySmall }}>
              <p className="font-mono text-xs text-red-400 uppercase tracking-widest">
                &gt; ERR: Matrix connection required. Pair with remote node first.
              </p>
            </div>
          ) : (
            <>
              {uploading ? (
                <div className="flex flex-col items-center justify-center gap-4 p-12 bg-surface border border-neon-blue/50" style={{ clipPath: polyClip }}>
                  <Spinner />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neon-blue animate-pulse">
                    &gt; Uploading Data Packet...
                  </p>
                </div>
              ) : (
                <UploadZone onUpload={handleUpload} />
              )}

              {uploadError && (
                <p className="font-mono text-[10px] text-red-500 uppercase mt-2">&gt; ERR: {uploadError}</p>
              )}

              {/* Warning/Info Box */}
              <div className="flex items-start gap-3 px-4 py-3 mt-6 bg-yellow-400/5 border border-yellow-400/30" style={{ clipPath: polySmall }}>
                <span className="text-yellow-400 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <p className="font-mono text-[10px] text-yellow-400/80 uppercase tracking-widest leading-relaxed">
                  SYS_NOTE: Imagery is auto-converted to 1-bit monochrome and dithered prior to hardware transmission.
                </p>
              </div>

              {/* Grid Header */}
              <div className="flex items-end justify-between mt-16 mb-8 border-b border-white/10 pb-4">
                <h3 className="font-display text-2xl font-black uppercase tracking-wider text-white">
                  Data <span className="text-neon-blue">Queue</span>
                </h3>
                <div className="font-mono text-[10px] text-text-muted uppercase tracking-widest flex gap-4">
                  <span>[ <span className="text-neon-purple">{queued}</span> Queued ]</span>
                  <span>[ <span className="text-white/50">{used}</span> Parsed ]</span>
                </div>
              </div>

              <PhotoGrid
                items={content}
                myId={myId}
                partnerName={partnerName}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}