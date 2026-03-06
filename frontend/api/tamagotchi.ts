/**
 * api/tamagotchi.ts
 *
 * Typed client for every tamagotchi endpoint on the Go backend.
 * All functions require an auth token (Clerk JWT).
 *
 * Usage:
 *   import { fetchMyTamagotchi, buyItem } from "@/api/tamagotchi";
 *   const state = await fetchMyTamagotchi(token);
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7111";

async function req<T>(
  token: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = `${method} ${path} → ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Models (mirrors backend/internal/models/models.go) ───────────────────────

export type TamagotchiMood =
  | "happy"
  | "neutral"
  | "sad"
  | "sleeping"
  | "excited";

export type TamagotchiSpecies =
  | "bear"
  | "cat"
  | "bunny"
  | "dog"
  | "shark"
  | "fox"
  | "penguin";

export type ItemType =
  | "outfit"
  | "accessory"
  | "background"
  | "animation"
  | "position";

export type EquippedSlot = "outfit" | "accessory" | "background" | "position";

export interface Tamagotchi {
  id: string;
  couple_id: string;
  owner_id: string;
  controller_id: string;
  name: string;
  species: TamagotchiSpecies;
  // free cosmetic fields (stored on the tamagotchis row)
  background: string;
  animation: string;
  position: string;
  health: number;
  max_health: number;
  xp: number;
  level: number;
  mood: TamagotchiMood;
  last_fed_at?: string;
  created_at: string;
}

export interface TamagotchiItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  xp_cost: number;
  preview_url?: string;
  species_lock?: string;
  unlocks_at_level: number;
}

export interface TamagotchiInventoryEntry {
  id: string;
  tamagotchi_id: string;
  item: TamagotchiItem;
  purchased_at: string;
}

export interface TamagotchiEquipped {
  tamagotchi_id: string;
  slot: EquippedSlot;
  item: TamagotchiItem;
}

export type TamagotchiEventType =
  | "fed"
  | "leveled_up"
  | "item_purchased"
  | "item_equipped"
  | "mood_changed"
  | "sleeping"
  | "woke_up"
  | "decay";

export interface TamagotchiEvent {
  id: string;
  tamagotchi_id: string;
  type: TamagotchiEventType;
  xp_delta: number;
  health_delta: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TamagotchiState {
  tamagotchi: Tamagotchi;
  equipped: TamagotchiEquipped[];
  inventory: TamagotchiInventoryEntry[];
  recent_events: TamagotchiEvent[];
}

export interface ShopResponse {
  tamagotchi_id: string;
  tamagotchi_xp: number;
  tamagotchi_level: number;
  xp_this_level: number;
  xp_next_level: number;
  items: TamagotchiItem[];
}

export interface EventSet {
  tamagotchi_id: string;
  role: "mine" | "partner";
  events: TamagotchiEvent[];
}

export interface EventsResponse {
  event_sets: EventSet[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /api/tamagotchi/mine
 * The Tamagotchi YOU own — lives on your frame, fed by your partner.
 */
export function fetchMyTamagotchi(token: string): Promise<TamagotchiState> {
  return req<TamagotchiState>(token, "GET", "/api/tamagotchi/mine");
}

/**
 * GET /api/tamagotchi/partner
 * Your PARTNER'S Tamagotchi — the one you feed by sending content.
 */
export function fetchPartnerTamagotchi(token: string): Promise<TamagotchiState> {
  return req<TamagotchiState>(token, "GET", "/api/tamagotchi/partner");
}

/**
 * POST /api/tamagotchi/rename
 * Rename the Tamagotchi you own.
 */
export function renameTamagotchi(token: string, name: string): Promise<Tamagotchi> {
  return req<Tamagotchi>(token, "POST", "/api/tamagotchi/rename", { name });
}

/**
 * GET /api/tamagotchi/shop
 * Shop items available for the Tamagotchi you control (partner's).
 */
export function fetchShop(token: string): Promise<ShopResponse> {
  return req<ShopResponse>(token, "GET", "/api/tamagotchi/shop");
}

/**
 * POST /api/tamagotchi/shop/buy
 * Purchase an item; XP is deducted from the Tamagotchi you control.
 */
export function buyItem(token: string, itemId: string): Promise<TamagotchiState> {
  return req<TamagotchiState>(token, "POST", "/api/tamagotchi/shop/buy", {
    item_id: itemId,
  });
}

/**
 * POST /api/tamagotchi/equip
 * Equip an owned item to a slot on the Tamagotchi you control.
 */
export function equipItem(
  token: string,
  itemId: string,
  slot: EquippedSlot,
): Promise<TamagotchiState> {
  return req<TamagotchiState>(token, "POST", "/api/tamagotchi/equip", {
    item_id: itemId,
    slot,
  });
}

/**
 * GET /api/tamagotchi/events
 * Recent events for both Tamagotchis in the couple (activity feed).
 */
export function fetchEvents(token: string): Promise<EventsResponse> {
  return req<EventsResponse>(token, "GET", "/api/tamagotchi/events");
}

/**
 * PATCH /api/tamagotchi/appearance
 * Updates free cosmetic fields on YOUR Tamagotchi (species, background,
 * animation, position). These are NOT shop-gated.
 * Only the fields you pass are updated — omit a field to leave it unchanged.
 */
export function updateAppearance(
  token: string,
  patch: {
    species?: string;
    background?: string;
    animation?: string;
    position?: string;
  },
): Promise<TamagotchiState> {
  return req<TamagotchiState>(token, "PATCH", "/api/tamagotchi/appearance", patch);
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** XP progress within the current level, as a 0–1 fraction. */
export function xpProgress(state: TamagotchiState): number {
  const { xp_this_level, xp_next_level } = state as unknown as ShopResponse;
  if (!xp_next_level) return 1;
  return Math.min(xp_this_level / xp_next_level, 1);
}

/** Health as a 0–1 fraction. */
export function healthFraction(tama: Tamagotchi): number {
  if (!tama.max_health) return 0;
  return Math.min(tama.health / tama.max_health, 1);
}

/** Find what's currently equipped in a given slot. */
export function equippedInSlot(
  equipped: TamagotchiEquipped[],
  slot: EquippedSlot,
): TamagotchiItem | undefined {
  return equipped.find((e) => e.slot === slot)?.item;
}

/** Returns true if the item is in the inventory. */
export function isOwned(
  inventory: TamagotchiInventoryEntry[],
  itemId: string,
): boolean {
  return inventory.some((e) => e.item.id === itemId);
}