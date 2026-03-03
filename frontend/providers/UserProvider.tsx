// // "use client";

// // import {
// //   createContext,
// //   useCallback,
// //   useContext,
// //   useEffect,
// //   useState,
// // } from "react";
// // import { useAuth } from "@clerk/nextjs";
// // import type {
// //   User,
// //   Couple,
// //   Device,
// //   FrameState,
// //   Content,
// // } from "@/types/api";
// // import { api } from "@/api";

// // interface UserContextValue {
// //   user: User | null;
// //   couple: Couple | null;
// //   partnerUser: User | null;       // the other person in the couple
// //   device: Device | null;
// //   frameState: FrameState | null;
// //   content: Content[];             // full content list for this couple

// //   isLoading: boolean;             // true during initial fetch
// //   isRefreshing: boolean;          // true during background refetch
// //   error: string | null;

// //   /** Re-fetches /api/users/me + /api/couples/me + /api/devices/me */
// //   refetch: () => Promise<void>;
// //   /** Re-fetches only the content list */
// //   refetchContent: () => Promise<void>;

// //   // ── Mutations ─────────────────────────────────────────────────────────────
// //   /** Creates a pending couple and refetches state */
// //   createCouple: (timezone?: string) => Promise<void>;

// //   /** Joins a couple via invite token and refetches state */
// //   joinCouple: (inviteToken: string) => Promise<void>;

// //   /** Updates the couple timezone and refetches state */
// //   updateTimezone: (timezone: string) => Promise<void>;

// //   /**
// //    * Pairs a frame by MAC address.
// //    * Returns the created Device on success.
// //    */
// //   pairDevice: (macAddress: string, label?: string) => Promise<Device>;

// //   /** Sends a text message to the partner's frame */
// //   sendMessage: (text: string, caption?: string) => Promise<Content>;

// //   /**
// //    * Uploads a photo or drawing to the partner's frame.
// //    * Returns the created Content on success.
// //    */
// //   uploadContent: (
// //     file: File,
// //     type: "photo" | "drawing",
// //     caption?: string
// //   ) => Promise<Content>;

// //   deleteContent: (contentId: string) => Promise<void>;
// // }

// // const UserContext = createContext<UserContextValue | null>(null);

// // export function UserProvider({ children }: { children: React.ReactNode }) {
// //   const { getToken, isSignedIn, isLoaded: clerkLoaded } = useAuth();

// //   const [user, setUser] = useState<User | null>(null);
// //   const [couple, setCouple] = useState<Couple | null>(null);
// //   const [partnerUser, setPartnerUser] = useState<User | null>(null);
// //   const [device, setDevice] = useState<Device | null>(null);
// //   const [frameState, setFrameState] = useState<FrameState | null>(null);
// //   const [content, setContent] = useState<Content[]>([]);

// //   const [isLoading, setIsLoading] = useState(true);
// //   const [isRefreshing, setIsRefreshing] = useState(false);
// //   const [error, setError] = useState<string | null>(null);

// //   const token = useCallback(async (): Promise<string> => {
// //     const t = await getToken();
// //     if (!t) throw new Error("Not authenticated");
// //     return t;
// //   }, [getToken]);

// //   const fetchAll = useCallback(
// //     async (background = false) => {
// //       if (!isSignedIn) return;

// //       background ? setIsRefreshing(true) : setIsLoading(true);
// //       setError(null);

// //       try {
// //         const t = await token();

// //         // Always fetch /me first — it has user + couple + device in one shot
// //         const me = await api.getMe(t);
// //         setUser(me.user);
// //         setCouple(me.couple);
// //         setDevice(me.device ?? null);

// //         // Fetch couple details (partner profile) if in a couple
// //         if (me.couple) {
// //           try {
// //             const coupleData = await api.getCouple(t);
// //             // partnerUser is whichever of user_a/user_b is not us
// //             const partner =
// //               coupleData.user_a.id === me.user.id
// //                 ? coupleData.user_b
// //                 : coupleData.user_a;
// //             setPartnerUser(partner);
// //           } catch {
// //             // Non-fatal — couple might be pending
// //           }
// //         } else {
// //           setPartnerUser(null);
// //         }

// //         // Fetch device frame state if device exists
// //         if (me.device) {
// //           try {
// //             const deviceData = await api.getDevice(t);
// //             setFrameState(deviceData.frame_state);
// //           } catch {
// //             setFrameState(null);
// //           }
// //         } else {
// //           setFrameState(null);
// //         }

// //         // Fetch content list if in an active couple
// //         if (me.couple?.status === "active") {
// //           try {
// //             const contentData = await api.listContent(t);
// //             setContent(contentData.items ?? []);
// //           } catch {
// //             setContent([]);
// //           }
// //         } else {
// //           setContent([]);
// //         }
// //       } catch (err) {
// //         const msg =
// //           err instanceof Error ? err.message : "Failed to load your data";
// //         setError(msg);
// //       } finally {
// //         setIsLoading(false);
// //         setIsRefreshing(false);
// //       }
// //     },
// //     [isSignedIn, token]
// //   );

// //   // Fetch once when Clerk finishes loading and the user is signed in
// //   useEffect(() => {
// //     if (clerkLoaded && isSignedIn) {
// //       fetchAll(false);
// //     } else if (clerkLoaded && !isSignedIn) {
// //       // Clear state on sign-out
// //       setUser(null);
// //       setCouple(null);
// //       setPartnerUser(null);
// //       setDevice(null);
// //       setFrameState(null);
// //       setContent([]);
// //       setIsLoading(false);
// //     }
// //   }, [clerkLoaded, isSignedIn, fetchAll]);

// //   const refetchContent = useCallback(async () => {
// //     if (!isSignedIn) return;
// //     try {
// //       const t = await token();
// //       const data = await api.listContent(t);
// //       setContent(data.items ?? []);
// //     } catch {
// //       // Non-fatal
// //     }
// //   }, [isSignedIn, token]);

// //   const createCouple = useCallback(
// //     async (timezone?: string) => {
// //       const t = await token();
// //       const tz =
// //         timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
// //       await api.createCouple(t, tz);
// //       await fetchAll(true);
// //     },
// //     [token, fetchAll]
// //   );

// //   const joinCouple = useCallback(
// //     async (inviteToken: string) => {
// //       const t = await token();
// //       await api.joinCouple(t, inviteToken);
// //       await fetchAll(true);
// //     },
// //     [token, fetchAll]
// //   );

// //   const updateTimezone = useCallback(
// //     async (timezone: string) => {
// //       const t = await token();
// //       const updated = await api.updateCoupleTimezone(t, timezone);
// //       setCouple(updated);
// //     },
// //     [token]
// //   );

// //   const pairDevice = useCallback(
// //     async (macAddress: string, label?: string): Promise<Device> => {
// //       const t = await token();
// //       const device = await api.pairDevice(t, macAddress, label);
// //       setDevice(device);
// //       return device;
// //     },
// //     [token]
// //   );

// //   const sendMessage = useCallback(
// //     async (text: string, caption?: string): Promise<Content> => {
// //       const t = await token();
// //       const created = await api.sendMessage(t, text, caption);
// //       // Optimistically prepend to content list
// //       setContent((prev) => [created, ...prev]);
// //       return created;
// //     },
// //     [token]
// //   );

// //   const uploadContent = useCallback(
// //     async (
// //       file: File,
// //       type: "photo" | "drawing",
// //       caption?: string
// //     ): Promise<Content> => {
// //       const t = await token();
// //       const created = await api.uploadContent(t, file, type, caption);
// //       setContent((prev) => [created, ...prev]);
// //       return created;
// //     },
// //     [token]
// //   );

// //   const deleteContent = useCallback(
// //     async (contentId: string): Promise<void> => {
// //       const t = await token();
// //       await api.deleteContent(t, contentId);
// //       // Optimistically remove from local state
// //       setContent((prev) => prev.filter((c) => c.id !== contentId));
// //     },
// //     [token]
// //   );

// //   const value: UserContextValue = {
// //     user,
// //     couple,
// //     partnerUser,
// //     device,
// //     frameState,
// //     content,
// //     isLoading,
// //     isRefreshing,
// //     error,
// //     refetch: () => fetchAll(true),
// //     refetchContent,
// //     createCouple,
// //     joinCouple,
// //     updateTimezone,
// //     pairDevice,
// //     sendMessage,
// //     uploadContent,
// //     deleteContent,
// //   };

// //   return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
// // }

// // export function useUser(): UserContextValue {
// //   const ctx = useContext(UserContext);
// //   if (!ctx) {
// //     throw new Error("useUser must be used inside <UserProvider>");
// //   }
// //   return ctx;
// // }

// "use client";

// import {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useState,
// } from "react";
// import { useAuth } from "@clerk/nextjs";
// import type {
//   User,
//   Couple,
//   Device,
//   DeviceWithState,
//   FrameState,
//   Content,
// } from "@/types/api";
// import { api } from "@/api";

// interface UserContextValue {
//   user: User | null;
//   couple: Couple | null;
//   partnerUser: User | null;
//   device: Device | null;
//   frameState: FrameState | null;
//   coupleDevices: DeviceWithState[];
//   content: Content[];
//   isLoading: boolean;
//   isRefreshing: boolean;
//   error: string | null;
//   refetch: () => Promise<void>;
//   refetchContent: () => Promise<void>;
//   createCouple: (timezone?: string) => Promise<void>;
//   joinCouple: (inviteToken: string) => Promise<void>;
//   updateTimezone: (timezone: string) => Promise<void>;
//   pairDevice: (macAddress: string, label?: string) => Promise<Device>;
//   sendMessage: (text: string, caption?: string) => Promise<Content>;
//   uploadContent: (
//     file: File,
//     type: "photo" | "drawing",
//     caption?: string,
//   ) => Promise<Content>;
//   deleteContent: (contentId: string) => Promise<void>;
// }

// const UserContext = createContext<UserContextValue | null>(null);

// export function UserProvider({ children }: { children: React.ReactNode }) {
//   const { getToken, isSignedIn, isLoaded: clerkLoaded } = useAuth();
//   const [user, setUser] = useState<User | null>(null);
//   const [couple, setCouple] = useState<Couple | null>(null);
//   const [partnerUser, setPartnerUser] = useState<User | null>(null);
//   const [device, setDevice] = useState<Device | null>(null);
//   const [frameState, setFrameState] = useState<FrameState | null>(null);
//   const [coupleDevices, setCoupleDevices] = useState<DeviceWithState[]>([]);
//   const [content, setContent] = useState<Content[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const token = useCallback(async (): Promise<string> => {
//     const t = await getToken();
//     if (!t) throw new Error("Not authenticated");
//     return t;
//   }, [getToken]);

//   const fetchAll = useCallback(
//     async (background = false) => {
//       if (!isSignedIn) return;
//       background ? setIsRefreshing(true) : setIsLoading(true);
//       setError(null);
//       try {
//         const t = await token();
//         const me = await api.getMe(t);
//         setUser(me.user);
//         setCouple(me.couple);
//         setDevice(me.device ?? null);

//         if (me.couple) {
//           try {
//             const coupleData = await api.getCouple(t);
//             const partner =
//               coupleData.user_a.id === me.user.id
//                 ? coupleData.user_b
//                 : coupleData.user_a;
//             setPartnerUser(partner);
//           } catch {
//             /* pending */
//           }

//           try {
//             const devData = await api.getCoupleDevices(t);
//             setCoupleDevices(devData.devices ?? []);
//           } catch {
//             setCoupleDevices([]);
//           }
//         } else {
//           setPartnerUser(null);
//           setCoupleDevices([]);
//         }

//         if (me.device) {
//           try {
//             const deviceData = await api.getDevice(t);
//             setFrameState(deviceData.frame_state);
//           } catch {
//             setFrameState(null);
//           }
//         } else {
//           setFrameState(null);
//         }

//         if (me.couple?.status === "active") {
//           try {
//             const contentData = await api.listContent(t);
//             setContent(contentData.items ?? []);
//           } catch {
//             setContent([]);
//           }
//         } else {
//           setContent([]);
//         }
//       } catch (err) {
//         setError(
//           err instanceof Error ? err.message : "Failed to load your data",
//         );
//       } finally {
//         setIsLoading(false);
//         setIsRefreshing(false);
//       }
//     },
//     [isSignedIn, token],
//   );

//   useEffect(() => {
//     if (clerkLoaded && isSignedIn) {
//       fetchAll(false);
//     } else if (clerkLoaded && !isSignedIn) {
//       setUser(null);
//       setCouple(null);
//       setPartnerUser(null);
//       setDevice(null);
//       setFrameState(null);
//       setCoupleDevices([]);
//       setContent([]);
//       setIsLoading(false);
//     }
//   }, [clerkLoaded, isSignedIn, fetchAll]);

//   const refetchContent = useCallback(async () => {
//     if (!isSignedIn) return;
//     try {
//       const t = await token();
//       const data = await api.listContent(t);
//       setContent(data.items ?? []);
//     } catch {
//       /* non-fatal */
//     }
//   }, [isSignedIn, token]);

//   const createCouple = useCallback(
//     async (timezone?: string) => {
//       const t = await token();
//       await api.createCouple(
//         t,
//         timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
//       );
//       await fetchAll(true);
//     },
//     [token, fetchAll],
//   );

//   const joinCouple = useCallback(
//     async (inviteToken: string) => {
//       const t = await token();
//       await api.joinCouple(t, inviteToken);
//       await fetchAll(true);
//     },
//     [token, fetchAll],
//   );

//   const updateTimezone = useCallback(
//     async (timezone: string) => {
//       const t = await token();
//       setCouple(await api.updateCoupleTimezone(t, timezone));
//     },
//     [token],
//   );

//   const pairDevice = useCallback(
//     async (macAddress: string, label: string) => {
//       const t = await token();
//       const d = await api.pairDevice(t, macAddress, label);
//       setDevice(d);
//       await fetchAll(true); // ← full refetch, not manual setCoupleDevices
//       return d;
//     },
//     [token, fetchAll],
//   );

//   const sendMessage = useCallback(
//     async (text: string, caption?: string): Promise<Content> => {
//       const t = await token();
//       const created = await api.sendMessage(t, text, caption);
//       setContent((prev) => [created, ...prev]);
//       return created;
//     },
//     [token],
//   );

//   const uploadContent = useCallback(
//     async (
//       file: File,
//       type: "photo" | "drawing",
//       caption?: string,
//     ): Promise<Content> => {
//       const t = await token();
//       const created = await api.uploadContent(t, file, type, caption);
//       setContent((prev) => [created, ...prev]);
//       return created;
//     },
//     [token],
//   );

//   const deleteContent = useCallback(
//     async (contentId: string): Promise<void> => {
//       const t = await token();
//       await api.deleteContent(t, contentId);
//       setContent((prev) => prev.filter((c) => c.id !== contentId));
//     },
//     [token],
//   );

//   return (
//     <UserContext.Provider
//       value={{
//         user,
//         couple,
//         partnerUser,
//         device,
//         frameState,
//         coupleDevices,
//         content,
//         isLoading,
//         isRefreshing,
//         error,
//         refetch: () => fetchAll(true),
//         refetchContent,
//         createCouple,
//         joinCouple,
//         updateTimezone,
//         pairDevice,
//         sendMessage,
//         uploadContent,
//         deleteContent,
//       }}
//     >
//       {children}
//     </UserContext.Provider>
//   );
// }

// export function useUser(): UserContextValue {
//   const ctx = useContext(UserContext);
//   if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
//   return ctx;
// }


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
  uploadContent: (
    file: File,
    type: "photo" | "drawing",
    caption?: string,
  ) => Promise<Content>;
  deleteContent: (contentId: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded: clerkLoaded } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerUser, setPartnerUser] = useState<User | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [frameState, setFrameState] = useState<FrameState | null>(null);
  const [coupleDevices, setCoupleDevices] = useState<DeviceWithState[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Uses owner_id internally — always returns the correct device
        // regardless of whether couple_id is set on the device row.
        const me = await api.getMe(t);
        setUser(me.user);
        setCouple(me.couple);

        const myDevice = me.device ?? null;
        setDevice(myDevice);

        // ── Step 2: own frame state ────────────────────────────────────────
        // Fetch before building coupleDevices so we can inject it below.
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
          // Partner profile
          try {
            const coupleData = await api.getCouple(t);
            const partner =
              coupleData.user_a.id === me.user.id
                ? coupleData.user_b
                : coupleData.user_a;
            setPartnerUser(partner ?? null);
          } catch {
            // Pending couple — partner hasn't joined yet, non-fatal
          }

          // ── Step 4: couple devices ───────────────────────────────────────
          // /api/devices/couple queries WHERE couple_id = $1.
          // PROBLEM: a device's couple_id is NULL when the device was paired
          // before the couple activated (timing gap between pair and join).
          // FIX: always ensure the current user's own device appears in the
          // list by injecting it from me.device when it's missing.
          let rawList: DeviceWithState[] = [];
          try {
            const devData = await api.getCoupleDevices(t);
            rawList = devData.devices ?? [];
          } catch {
            // Non-fatal — couple may be pending or device couple_id is null
          }

          const myDeviceAlreadyInList = myDevice
            ? rawList.some((d) => d.device.id === myDevice.id)
            : false;

          const mergedList: DeviceWithState[] =
            myDevice && !myDeviceAlreadyInList
              ? [{ device: myDevice, frame_state: myFrameState }, ...rawList]
              : rawList;

          setCoupleDevices(mergedList);
        } else {
          setPartnerUser(null);
          // No couple yet — still expose own device in the list if paired
          setCoupleDevices(
            myDevice
              ? [{ device: myDevice, frame_state: myFrameState }]
              : [],
          );
        }

        // ── Step 5: content ────────────────────────────────────────────────
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
        setError(
          err instanceof Error ? err.message : "Failed to load your data",
        );
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
    } catch {
      // Non-fatal
    }
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
      // Full refetch so coupleDevices is rebuilt with the correct merged list
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
    async (
      file: File,
      type: "photo" | "drawing",
      caption?: string,
    ): Promise<Content> => {
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
        user,
        couple,
        partnerUser,
        device,
        frameState,
        coupleDevices,
        content,
        isLoading,
        isRefreshing,
        error,
        refetch: () => fetchAll(true),
        refetchContent,
        createCouple,
        joinCouple,
        updateTimezone,
        pairDevice,
        sendMessage,
        uploadContent,
        deleteContent,
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
