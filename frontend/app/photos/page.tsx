"use client";
import { useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, Badge, Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { cn } from "@/lib/utils";
import type { Content } from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(c: Content, myId: string): string {
  if (c.status === "displayed") return "Next up";
  if (c.status === "queued") return "In queue";
  return c.displayed_at
    ? `Used · ${new Date(c.displayed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "Used";
}

function StatusBadge({ content }: { content: Content }) {
  if (content.status === "displayed")
    return (
      <Badge variant="online" className="text-[10px]">
        Next up
      </Badge>
    );
  if (content.status === "queued")
    return (
      <Badge variant="terra" className="text-[10px]">
        In queue
      </Badge>
    );
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] tracking-wide"
      style={{ background: "rgba(44,24,16,0.55)", color: "var(--cream)" }}
    >
      {content.displayed_at
        ? `Used · ${new Date(content.displayed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
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
  // Only show photo and drawing content
  const photos = items.filter(
    (c) => c.type === "photo" || c.type === "drawing",
  );

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted py-8 text-center">
        No photos yet. Upload one above to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((c) => {
        const fromMe = c.sent_by === myId;
        const canDelete = fromMe && c.status === "queued";

        return (
          <div
            key={c.id}
            className="group relative aspect-square rounded-xl overflow-hidden"
            style={{ background: "var(--warm)" }}
          >
            {/* Photo preview — show Cloudinary image if storage_key exists */}
            {c.storage_key ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE}/${c.storage_key}`}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#ddd4c0,#c8b89a)",
                }}
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
                  <p
                    className="text-xs"
                    style={{ color: "rgba(120,100,80,0.6)" }}
                  >
                    From {fromMe ? "you" : partnerName}
                  </p>
                </div>
              </div>
            )}

            {/* Status badge */}
            <div className="absolute top-2 left-2">
              <StatusBadge content={c} />
            </div>

            {/* Delete button — only for your queued photos */}
            {canDelete && (
              <button
                onClick={() => onDelete(c.id)}
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
            JPG, PNG or WebP · Max 20MB · Auto-dithered for e-ink display
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

import { useState } from "react";

export default function PhotosPage() {
  const { user, content, isLoading, uploadContent, deleteContent, couple } =
    useUser();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(files: FileList) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      await uploadContent(file, "photo");
    } catch (error) {
      const err = error as Error;
      setUploadError(err.message ?? "Upload failed");
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

  const photos = content.filter(
    (c) => c.type === "photo" || c.type === "drawing",
  );
  const queued = photos.filter((c) => c.status !== "archived").length;
  const used = photos.filter((c) => c.status === "archived").length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  const myId = user?.id ?? "";
  const partnerName = "your partner"; // useUser().partnerUser?.name.split(" ")[0] via destructure below

  return (
    <AppLayout>
      <div className="page-enter">
        <div className="mb-10">
          <p className="text-eyebrow mb-2">Photo queue</p>
          <h1 className="font-display text-5xl font-light text-deep">
            Your shared <em className="italic text-terra">memories.</em>
          </h1>
          <p
            className="text-base text-muted mt-2 max-w-lg leading-relaxed"
            style={{ fontWeight: 300 }}
          >
            Photos cycle through the frame daily. Upload yours and your partner
            uploads theirs — they alternate automatically.
          </p>
        </div>

        {couple?.status !== "active" ? (
          <Card padding="md">
            <p className="text-sm text-muted">
              Connect with your partner first to share photos.
            </p>
          </Card>
        ) : (
          <>
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border border-blush bg-warm">
                <Spinner />
                <p className="text-sm text-muted">Uploading…</p>
              </div>
            ) : (
              <UploadZone onUpload={handleUpload} />
            )}

            {uploadError && (
              <p className="text-xs text-red-500 mt-2">{uploadError}</p>
            )}

            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-xl mt-4"
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
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--gold)" }}
              >
                Photos are automatically converted to black-and-white and
                dithered before being sent to the frame.
              </p>
            </div>

            <div className="flex items-center justify-between mt-10 mb-5">
              <h3 className="font-display text-2xl font-normal text-deep">
                Queue & history
              </h3>
              <p className="text-xs text-muted">
                <span className="font-normal text-terra">{queued}</span> queued
                · <span className="font-normal text-muted">{used}</span> used
              </p>
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
    </AppLayout>
  );
}
