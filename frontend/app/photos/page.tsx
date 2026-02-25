"use client";
import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

type PhotoStatus = "next" | "queued" | "used";
type PhotoSource = "you" | "partner";

interface Photo {
  id: string;
  status: PhotoStatus;
  from: PhotoSource;
  label: string;
  previewBg: string;
}

const MOCK_PHOTOS: Photo[] = [
  {
    id: "1",
    status: "next",
    from: "partner",
    label: "Next up",
    previewBg: "linear-gradient(135deg,#ddd4c0,#c8b89a)",
  },
  {
    id: "2",
    status: "queued",
    from: "you",
    label: "In queue",
    previewBg: "linear-gradient(135deg,#d4c8b8,#e0d0bc)",
  },
  {
    id: "3",
    status: "queued",
    from: "partner",
    label: "In queue",
    previewBg: "linear-gradient(135deg,#c8bca8,#d8cbb8)",
  },
  {
    id: "4",
    status: "used",
    from: "you",
    label: "Used · Jan 14",
    previewBg: "linear-gradient(135deg,#e0d8cc,#d0c8bc)",
  },
  {
    id: "5",
    status: "used",
    from: "partner",
    label: "Used · Jan 13",
    previewBg: "linear-gradient(135deg,#d8d0c4,#c8c0b4)",
  },
  {
    id: "6",
    status: "used",
    from: "you",
    label: "Used · Jan 12",
    previewBg: "linear-gradient(135deg,#ccc4b8,#bcb4a8)",
  },
];

function StatusBadge({ status }: { status: PhotoStatus }) {
  if (status === "next")
    return (
      <Badge variant="online" className="text-[10px]">
        Next up
      </Badge>
    );
  if (status === "queued")
    return (
      <Badge variant="terra" className="text-[10px]">
        In queue
      </Badge>
    );
  return (
    <Badge variant="offline" className="text-[10px]">
      {""}
    </Badge>
  );
}

function PhotoGrid({
  photos,
  onDelete,
}: {
  photos: Photo[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((p) => (
        <div
          key={p.id}
          className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer"
          style={{ background: "var(--warm)" }}
        >
          {/* Photo fill */}
          <div
            className="w-full h-full transition-transform duration-300 group-hover:scale-105 flex items-center justify-center"
            style={{ background: p.previewBg }}
          >
            <div className="text-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(120,100,80,0.5)"
                strokeWidth="1.5"
                className="mx-auto mb-1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-xs" style={{ color: "rgba(120,100,80,0.6)" }}>
                From {p.from === "you" ? "you" : "Alex"}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            {p.status !== "used" && <StatusBadge status={p.status} />}
            {p.status === "used" && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] tracking-wide"
                style={{
                  background: "rgba(44,24,16,0.55)",
                  color: "var(--cream)",
                }}
              >
                {p.label}
              </span>
            )}
          </div>

          {/* Delete btn — only for your queued/next photos */}
          {p.from === "you" && p.status !== "used" && (
            <button
              onClick={() => onDelete(p.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(44,24,16,0.6)", color: "white" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function UploadZone({ onUpload }: { onUpload: (files: FileList) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) onUpload(e.dataTransfer.files);
    },
    [onUpload]
  );

  return (
    <div
      className={cn("upload-zone p-12", dragging && "drag-over")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
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

      <div className="flex flex-col items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--blush)", color: "var(--mid)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <div>
          <p className="font-display text-xl text-mid text-center">
            {dragging
              ? "Drop to upload"
              : "Drop a photo here, or click to browse"}
          </p>
          <p className="text-xs text-muted text-center mt-1">
            JPG, PNG or WebP · Max 10MB · Auto-dithered for e-ink display
          </p>
        </div>
      </div>
    </div>
  );
}

function DitherInfoBanner() {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
      style={{
        background: "rgba(184,147,90,0.08)",
        border: "1px solid rgba(184,147,90,0.2)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.8"
        className="shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="text-xs leading-relaxed" style={{ color: "var(--gold)" }}>
        Photos are automatically converted to black-and-white and dithered by
        the server before being sent to the frame. High-contrast photos with
        clear subjects work best.
      </p>
    </div>
  );
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>(MOCK_PHOTOS);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(files: FileList) {
    setUploading(true);
    // TODO: POST /api/photos with multipart form data
    await new Promise((r) => setTimeout(r, 1200));
    // Add mock uploaded photo
    const newPhoto: Photo = {
      id: Date.now().toString(),
      status: "queued",
      from: "you",
      label: "In queue",
      previewBg: "linear-gradient(135deg, var(--warm), var(--blush))",
    };
    setPhotos((prev) => [newPhoto, ...prev]);
    setUploading(false);
  }

  function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const queued = photos.filter((p) => p.status !== "used").length;
  const used = photos.filter((p) => p.status === "used").length;

  return (
    <AppLayout>
      <div className="page-enter">
        {/* Header */}
        <div className="mb-10">
          <p className="text-eyebrow mb-2">Photo queue</p>
          <h1 className="font-display text-5xl font-light text-deep">
            Your shared <em className="italic text-terra">memories.</em>
          </h1>
          <p
            className="text-base text-muted mt-2 max-w-lg leading-relaxed"
            style={{ fontWeight: 300 }}
          >
            Photos cycle through the frame daily. Upload yours and Alex uploads
            theirs — they alternate automatically.
          </p>
        </div>

        {/* Upload zone */}
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border border-blush bg-warm">
            <div className="w-8 h-8 border-2 border-blush border-t-terra rounded-full animate-spin" />
            <p className="text-sm text-muted">Uploading and dithering…</p>
          </div>
        ) : (
          <UploadZone onUpload={handleUpload} />
        )}

        {/* Dither info */}
        <div className="mt-4">
          <DitherInfoBanner />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-10 mb-5">
          <h3 className="font-display text-2xl font-normal text-deep">
            Queue & history
          </h3>
          <p className="text-xs text-muted">
            <span className="font-normal text-terra">{queued}</span> queued ·{" "}
            <span className="font-normal text-muted">{used}</span> used
          </p>
        </div>

        {/* Grid */}
        <PhotoGrid photos={photos} onDelete={handleDelete} />
      </div>
    </AppLayout>
  );
}
