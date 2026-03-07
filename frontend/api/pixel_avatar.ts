// ─── Add these to your existing api/api.ts ────────────────────────────────────

export interface PixelAvatar {
  id:         string;
  user_id:    string;
  name:       string;
  pixels:     number[];
  palette:    string[];
  width:      number;
  height:     number;
  created_at: string;
  updated_at: string;
}

export interface FramePixelAvatar {
  pixels:  number[];
  palette: string[];
  width:   number;
  height:  number;
}

export async function getMyPixelAvatar(token: string): Promise<PixelAvatar | null> {
  const res = await fetch("/api/pixel-avatar/mine", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch avatar");
  return res.json();
}

export async function upsertMyPixelAvatar(
  token: string,
  data: { name: string; pixels: number[]; palette: string[]; width: number; height: number }
): Promise<PixelAvatar> {
  const res = await fetch("/api/pixel-avatar", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save avatar");
  return res.json();
}

export async function getPartnerPixelAvatar(token: string): Promise<PixelAvatar | null> {
  const res = await fetch("/api/pixel-avatar/partner", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch partner avatar");
  return res.json();
}