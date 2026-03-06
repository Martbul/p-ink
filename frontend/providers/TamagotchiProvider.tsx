"use client";

/**
 * TamagotchiProvider
 *
 * Two distinct concerns, one provider:
 *
 * 1. LOCAL UI CONFIG  (localStorage only, no backend)
 *    species, background, outfit, animation, position — cosmetic choices
 *    used by the dashboard widget and the studio preview.
 *
 * 2. REMOTE BACKEND STATE  (fetched from Go API via Clerk token)
 *    health, XP, level, mood, name, inventory, equipped items, events.
 *    Exposed as `myState` (your Tamagotchi) and `partnerState` (the one you feed).
 *
 * The split is intentional:
 *   - UI config can change instantly without a round-trip.
 *   - Backend state is the source of truth for game logic.
 *
 * Mutation helpers (rename, buy, equip) call the API and refresh state on success.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  fetchMyTamagotchi,
  fetchPartnerTamagotchi,
  fetchShop,
  renameTamagotchi,
  buyItem,
  equipItem,
  updateAppearance,
  type TamagotchiState,
  type ShopResponse,
  type EquippedSlot,
} from "@/api/tamagotchi";

// ─── Local UI config types ────────────────────────────────────────────────────

export interface TamagotchiConfig {
  species: string;
  background: string;
  outfit: string;
  accessory: string;
  animation: string;
  position: string;
}

export interface ScreenEntry {
  id: string;
}

// ─── Context value ────────────────────────────────────────────────────────────

interface TamagotchiContextValue {
  // ── Local UI config ──────────────────────────────────────────────────────
  /** Current cosmetic config (mirrors localStorage) */
  config: TamagotchiConfig;
  /** Merge a partial patch into config (does NOT persist automatically) */
  setConfig: (patch: Partial<TamagotchiConfig>) => void;
  /** Flush current config to localStorage AND sync to backend — call from "Push to Frame" */
  saveConfig: () => Promise<void>;

  /** Active frame screens in swipe order */
  screens: ScreenEntry[];
  setScreens: (screens: ScreenEntry[]) => void;

  // ── Remote backend state ─────────────────────────────────────────────────
  /** Full state for YOUR Tamagotchi (on your frame, fed by partner) */
  myState: TamagotchiState | null;
  /** Full state for your PARTNER'S Tamagotchi (you feed it) */
  partnerState: TamagotchiState | null;
  /** Shop data for the Tamagotchi you control */
  shop: ShopResponse | null;

  /** Whether the initial backend fetch is in-flight */
  loading: boolean;
  /** Last fetch error, if any */
  error: string | null;

  /** Re-fetch both states from the backend */
  refresh: () => Promise<void>;

  // ── Mutations ────────────────────────────────────────────────────────────
  /** Rename YOUR Tamagotchi */
  rename: (name: string) => Promise<void>;
  /** Buy a shop item for the Tamagotchi you CONTROL (partner's) */
  buy: (itemId: string) => Promise<void>;
  /** Equip an owned item on the Tamagotchi you CONTROL */
  equip: (itemId: string, slot: EquippedSlot) => Promise<void>;
  /** Refresh shop data */
  refreshShop: () => Promise<void>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_TAMA_CONFIG: TamagotchiConfig = {
  species: "cat",
  background: "cyber",
  outfit: "none",
  accessory: "none",
  animation: "idle",
  position: "center",
};

export const DEFAULT_SCREENS: ScreenEntry[] = [
  { id: "tamagotchi" },
  { id: "photo-replay" },
  { id: "photo-slideshow" },
  { id: "custom-screen" },
];

const TAMA_STORAGE_KEY = "tama_config";
const SCREENS_STORAGE_KEY = "dashboard_screens";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readConfig(): TamagotchiConfig {
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

function readScreens(): ScreenEntry[] {
  if (typeof window === "undefined") return DEFAULT_SCREENS;
  try {
    const raw = localStorage.getItem(SCREENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SCREENS;
  } catch {
    return DEFAULT_SCREENS;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TamagotchiContext = createContext<TamagotchiContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TamagotchiProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  // ── Local UI state (lazy-init from localStorage) ─────────────────────────
  const [config, setConfigState] = useState<TamagotchiConfig>(() => readConfig());
  const [screens, setScreensState] = useState<ScreenEntry[]>(() => readScreens());

  // ── Remote backend state ─────────────────────────────────────────────────
  const [myState, setMyState] = useState<TamagotchiState | null>(null);
  const [partnerState, setPartnerState] = useState<TamagotchiState | null>(null);
  const [shop, setShop] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Cross-tab sync for local config ──────────────────────────────────────
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === TAMA_STORAGE_KEY) setConfigState(readConfig());
      if (e.key === SCREENS_STORAGE_KEY) setScreensState(readScreens());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Backend fetch ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const [mine, partner] = await Promise.all([
        fetchMyTamagotchi(token),
        // Partner tamagotchi may not exist yet if the couple isn't active
        fetchPartnerTamagotchi(token).catch(() => null),
      ]);
      setMyState(mine);
      setPartnerState(partner);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load tamagotchi";
      // Suppress "not found" — it just means the couple isn't linked yet
      if (!msg.toLowerCase().includes("not found")) setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  const refreshShop = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchShop(token);
      setShop(data);
    } catch {
      // Silently unavailable when no couple yet
    }
  }, [isSignedIn, getToken]);

  // Initial fetch once the user is signed in
  useEffect(() => {
    if (isSignedIn) {
      refresh();
      refreshShop();
    }
  }, [isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seed local config from backend state on first load ────────────────────
  // When myState arrives, merge species/background/animation/position from DB
  // into local config so the studio preview immediately reflects the real state.
  useEffect(() => {
    if (!myState) return;
    const t = myState.tamagotchi;
    setConfigState((prev) => ({
      ...prev,
      species:    t.species    ?? prev.species,
      background: t.background ?? prev.background,
      animation:  t.animation  ?? prev.animation,
      position:   t.position   ?? prev.position,
    }));
  }, [myState?.tamagotchi.id]); // only re-seed when tamagotchi identity changes

  // ── Local config mutations ────────────────────────────────────────────────
  const setConfig = useCallback((patch: Partial<TamagotchiConfig>) => {
    setConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * Persist current config:
   *   1. localStorage (for instant cross-tab sync)
   *   2. Backend PATCH /api/tamagotchi/appearance (species/bg/animation/position)
   *
   * outfit and accessory are shop items — they go through equip() instead.
   */
  const saveConfig = useCallback(async () => {
    // Capture current state value via functional update pattern
    let captured: TamagotchiConfig = DEFAULT_TAMA_CONFIG;
    setConfigState((current) => {
      captured = current;
      try {
        localStorage.setItem(TAMA_STORAGE_KEY, JSON.stringify(current));
      } catch {
        /* quota exceeded */
      }
      return current;
    });

    // Persist cosmetic fields to the backend
    if (isSignedIn) {
      try {
        const token = await getToken();
        if (token) {
          const updated = await updateAppearance(token, {
            species:    captured.species,
            background: captured.background,
            animation:  captured.animation,
            position:   captured.position,
          });
          setMyState(updated);
        }
      } catch (e) {
        // Don't block the user — local save already succeeded
        console.warn("[TamagotchiProvider] appearance sync failed:", e);
      }
    }
  }, [isSignedIn, getToken]);

  const setScreens = useCallback((next: ScreenEntry[]) => {
    setScreensState(next);
    try {
      localStorage.setItem(SCREENS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota exceeded */
    }
  }, []);

  // ── Backend mutations ─────────────────────────────────────────────────────
  const rename = useCallback(
    async (name: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await renameTamagotchi(token, name);
      await refresh();
    },
    [getToken, refresh],
  );

  const buy = useCallback(
    async (itemId: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updated = await buyItem(token, itemId);
      // buyItem returns the updated TamagotchiState for the controlled tamagotchi
      setPartnerState(updated);
      // Refresh shop so the bought item disappears from the list
      await refreshShop();
    },
    [getToken, refreshShop],
  );

  const equip = useCallback(
    async (itemId: string, slot: EquippedSlot) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updated = await equipItem(token, itemId, slot);
      setPartnerState(updated);
    },
    [getToken],
  );

  return (
    <TamagotchiContext.Provider
      value={{
        // local UI
        config,
        setConfig,
        saveConfig,
        screens,
        setScreens,
        // remote state
        myState,
        partnerState,
        shop,
        loading,
        error,
        refresh,
        // mutations
        rename,
        buy,
        equip,
        refreshShop,
      }}
    >
      {children}
    </TamagotchiContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTamagotchi(): TamagotchiContextValue {
  const ctx = useContext(TamagotchiContext);
  if (!ctx)
    throw new Error("useTamagotchi must be used inside <TamagotchiProvider>");
  return ctx;
}