"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import type {
  User,
  Couple,
  Device,
  DeviceWithState,
  FrameState,
  Content,
} from "@/types/api";
import { api } from "@/api";

interface UserContextValue {
  user: User | null;
  couple: Couple | null;
  partnerUser: User | null;
  device: Device | null;
  frameState: FrameState | null;
  coupleDevices: DeviceWithState[];
  content: Content[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchContent: () => Promise<void>;
  createCouple: (timezone?: string) => Promise<void>;
  joinCouple: (inviteToken: string) => Promise<void>;
  updateTimezone: (timezone: string) => Promise<void>;
  pairDevice: (macAddress: string, label?: string) => Promise<Device>;
  sendMessage: (text: string, caption?: string) => Promise<Content>;
  uploadContent: (file: File, type: "photo" | "drawing", caption?: string) => Promise<Content>;
  deleteContent: (contentId: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const [user, setUser]               = useState<User | null>(null);
  const [couple, setCouple]           = useState<Couple | null>(null);
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [device, setDevice]           = useState<Device | null>(null);
  const [frameState, setFrameState]   = useState<FrameState | null>(null);
  const [coupleDevices, setCoupleDevices] = useState<DeviceWithState[]>([]);
  const [content, setContent]         = useState<Content[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const token = useCallback(async (): Promise<string> => {
    const t = await getToken();
    if (!t) throw new Error("Not authenticated");
    return t;
  }, [getToken]);

  const fetchAll = useCallback(
    async (background = false) => {
      if (!isSignedIn) return;
      background ? setIsRefreshing(true) : setIsLoading(true);
      setError(null);

      try {
        const t = await token();

        // ── Step 1: /api/users/me ──────────────────────────────────────────
        const me = await api.getMe(t);
        setUser(me.user);
        setCouple(me.couple ?? null);

        const myDevice = me.device ?? null;
        setDevice(myDevice);

        // ── Step 2: own frame state ────────────────────────────────────────
        let myFrameState: FrameState | null = null;
        if (myDevice) {
          try {
            const deviceData = await api.getDevice(t);
            myFrameState = deviceData.frame_state ?? null;
          } catch {
            // non-fatal
          }
        }
        setFrameState(myFrameState);

        // ── Step 3: couple-level data ──────────────────────────────────────
        if (me.couple) {
          // Partner profile — only possible when couple is active (user_b exists)
          // For pending couples, /api/couples/me returns user_b: null — safe to handle
          if (me.couple.status === "active") {
            try {
              const coupleData = await api.getCouple(t);
              // user_a / user_b come back directly on the response object
              const partner =
                coupleData.user_a?.id === me.user.id
                  ? coupleData.user_b
                  : coupleData.user_a;
              setPartnerUser(partner ?? null);
            } catch {
              // Non-fatal — e.g. race between activation and refetch
              setPartnerUser(null);
            }
          } else {
            // Pending couple — partner hasn't joined yet
            setPartnerUser(null);
          }

          // ── Step 4: couple devices ────────────────────────────────────────
          // /api/devices/couple queries by couple_id OR by owner_id of both
          // partners (see GetDevicesByCouple in queries.go — it already uses
          // the UNION fallback). So this should always return correctly.
          let rawList: DeviceWithState[] = [];
          try {
            const devData = await api.getCoupleDevices(t);
            rawList = devData.devices ?? [];
          } catch {
            // Non-fatal — might 404 if couple is pending and no devices yet
          }

          // Ensure the current user's own device is always in the list,
          // even if couple_id wasn't set yet on the device row.
          const myDeviceInList = myDevice
            ? rawList.some((d) => d.device.id === myDevice.id)
            : false;

          setCoupleDevices(
            myDevice && !myDeviceInList
              ? [{ device: myDevice, frame_state: myFrameState }, ...rawList]
              : rawList,
          );
        } else {
          // No couple at all (potential joiner)
          setPartnerUser(null);
          setCoupleDevices(
            myDevice ? [{ device: myDevice, frame_state: myFrameState }] : [],
          );
        }

        // ── Step 5: content (active couples only) ─────────────────────────
        if (me.couple?.status === "active") {
          try {
            const contentData = await api.listContent(t);
            setContent(contentData.items ?? []);
          } catch {
            setContent([]);
          }
        } else {
          setContent([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load your data");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isSignedIn, token],
  );

  useEffect(() => {
    if (clerkLoaded && isSignedIn) {
      fetchAll(false);
    } else if (clerkLoaded && !isSignedIn) {
      setUser(null);
      setCouple(null);
      setPartnerUser(null);
      setDevice(null);
      setFrameState(null);
      setCoupleDevices([]);
      setContent([]);
      setIsLoading(false);
    }
  }, [clerkLoaded, isSignedIn, fetchAll]);

  const refetchContent = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const t = await token();
      const data = await api.listContent(t);
      setContent(data.items ?? []);
    } catch { /* non-fatal */ }
  }, [isSignedIn, token]);

  const createCouple = useCallback(
    async (timezone?: string) => {
      const t = await token();
      await api.createCouple(
        t,
        timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      );
      await fetchAll(true);
    },
    [token, fetchAll],
  );

  const joinCouple = useCallback(
    async (inviteToken: string) => {
      const t = await token();
      await api.joinCouple(t, inviteToken);
      await fetchAll(true);
    },
    [token, fetchAll],
  );

  const updateTimezone = useCallback(
    async (timezone: string) => {
      const t = await token();
      setCouple(await api.updateCoupleTimezone(t, timezone));
    },
    [token],
  );

  const pairDevice = useCallback(
    async (macAddress: string, label?: string): Promise<Device> => {
      const t = await token();
      const d = await api.pairDevice(t, macAddress, label);
      setDevice(d);
      await fetchAll(true);
      return d;
    },
    [token, fetchAll],
  );

  const sendMessage = useCallback(
    async (text: string, caption?: string): Promise<Content> => {
      const t = await token();
      const created = await api.sendMessage(t, text, caption);
      setContent((prev) => [created, ...prev]);
      return created;
    },
    [token],
  );

  const uploadContent = useCallback(
    async (file: File, type: "photo" | "drawing", caption?: string): Promise<Content> => {
      const t = await token();
      const created = await api.uploadContent(t, file, type, caption);
      setContent((prev) => [created, ...prev]);
      return created;
    },
    [token],
  );

  const deleteContent = useCallback(
    async (contentId: string): Promise<void> => {
      const t = await token();
      await api.deleteContent(t, contentId);
      setContent((prev) => prev.filter((c) => c.id !== contentId));
    },
    [token],
  );

  return (
    <UserContext.Provider
      value={{
        user, couple, partnerUser, device, frameState, coupleDevices, content,
        isLoading, isRefreshing, error,
        refetch: () => fetchAll(true),
        refetchContent,
        createCouple, joinCouple, updateTimezone,
        pairDevice, sendMessage, uploadContent, deleteContent,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}