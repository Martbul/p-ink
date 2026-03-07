export type SlideshowMode = "sequential" | "shuffle" | "random" | "loop-one";

export interface SlideshowSlide {
  id: string;
  slideshow_id: string;
  position: number;
  image_url: string;
  image_hash: string;
  caption?: string;
  duration_ms?: number;
  added_at: string;
  reaction_count: number;
  my_reaction: string;
}

export interface Slideshow {
  id: string;
  user_id: string;
  name: string;
  mode: SlideshowMode;
  slide_duration_ms: number;
  transition_ms: number;
  repeat: boolean;
  show_caption: boolean;
  show_date: boolean;
  show_progress: boolean;
  manual_advance: boolean;
  night_mode: boolean;
  night_start: number;
  night_end: number;
  is_active: boolean;
  current_index: number;
  last_advanced_at?: string;
  slides: SlideshowSlide[];
  created_at: string;
  updated_at: string;
}

export interface SlideshowSettings {
  name?: string;
  mode?: SlideshowMode;
  slide_duration_ms?: number;
  transition_ms?: number;
  repeat?: boolean;
  show_caption?: boolean;
  show_date?: boolean;
  show_progress?: boolean;
  manual_advance?: boolean;
  night_mode?: boolean;
  night_start?: number;
  night_end?: number;
  is_active?: boolean;
}

export interface SlideshowReaction {
  id: string;
  slide_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

const GO_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7111";

export async function getMySlideshow(token: string): Promise<Slideshow | null> {
  const res = await fetch("/api/slideshow", { headers: authHeader(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch slideshow");
  return res.json();
}

export async function upsertSlideshowSettings(
  token: string,
  settings: SlideshowSettings,
): Promise<Slideshow> {
  const res = await fetch("/api/slideshow", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save slideshow settings");
  return res.json();
}

export async function setSlideshowActive(
  token: string,
  active: boolean,
): Promise<void> {
  const res = await fetch("/api/slideshow/active", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error("Failed to toggle slideshow");
}

export async function uploadSlide(
  token: string,
  file: File,
  caption?: string,
  durationMs?: number,
): Promise<SlideshowSlide> {
  const form = new FormData();
  form.append("file", file);
  if (caption) form.append("caption", caption);
  if (durationMs) form.append("duration_ms", String(durationMs));

  const res = await fetch(`${GO_BASE}/api/slideshow/slides`, {
    method: "POST",
    headers: authHeader(token),
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "upload failed");
    throw new Error(msg);
  }
  return res.json();
}

export async function updateSlide(
  token: string,
  slideId: string,
  update: { caption?: string; duration_ms?: number },
): Promise<Slideshow> {
  const res = await fetch(`/api/slideshow/slides/${slideId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error("Failed to update slide");
  return res.json();
}

export async function deleteSlide(
  token: string,
  slideId: string,
): Promise<void> {
  const res = await fetch(`/api/slideshow/slides/${slideId}`, {
    method: "DELETE",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to delete slide");
}

export async function reorderSlides(
  token: string,
  orderedIds: string[],
): Promise<Slideshow> {
  const res = await fetch("/api/slideshow/slides/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ order: orderedIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder slides");
  return res.json();
}

export async function advanceSlide(
  token: string,
): Promise<{ current_index: number }> {
  const res = await fetch("/api/slideshow/advance", {
    method: "POST",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to advance slide");
  return res.json();
}

export async function reactToSlide(
  token: string,
  slideId: string,
  emoji: string,
): Promise<SlideshowReaction> {
  const res = await fetch(`/api/slideshow/slides/${slideId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) throw new Error("Failed to react");
  return res.json();
}

export async function deleteReaction(
  token: string,
  slideId: string,
): Promise<void> {
  const res = await fetch(`/api/slideshow/slides/${slideId}/react`, {
    method: "DELETE",
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to remove reaction");
}
