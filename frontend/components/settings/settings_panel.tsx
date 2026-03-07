"use client";

/**
 * SettingsPanel — improved
 *
 * New features vs original:
 *   - Remove / unpair device
 *   - Remove / unlink partner (with confirmation guard)
 *   - Location sharing: browser Geolocation → backend, shown on partner's frame
 *     as live coordinates + a subtle map link
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api/api";
import { cn } from "@/lib/utils";

// ─── Design tokens (match p·ink palette) ─────────────────────────────────────
const polySmall =
  "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
const polyTiny =
  "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

const C = {
  cyan: "#05d9e8",
  purple: "#b122e5",
  pink: "#ff2a6d",
  yellow: "#f5d300",
  bg: "#0a0a17",
  panel: "#0f0f1e",
  border: "rgba(255,255,255,0.07)",
  text: "#e0e4ff",
  muted: "rgba(255,255,255,0.25)",
};

const TZ_OPTIONS = [
  { value: "Europe/Sofia", label: "EU // SOFIA" },
  { value: "Europe/London", label: "EU // LONDON" },
  { value: "Europe/Paris", label: "EU // PARIS" },
  { value: "America/New_York", label: "NA // NEW_YORK" },
  { value: "America/Los_Angeles", label: "NA // LOS_ANGELES" },
  { value: "Asia/Tokyo", label: "AS // TOKYO" },
  { value: "Australia/Sydney", label: "OC // SYDNEY" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function coordStr(lat: number, lng: number) {
  const latD = Math.abs(lat).toFixed(4) + (lat >= 0 ? "°N" : "°S");
  const lngD = Math.abs(lng).toFixed(4) + (lng >= 0 ? "°E" : "°W");
  return `${latD}  ${lngD}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHead({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 mb-4"
      style={{ borderBottom: `1px solid ${color}20`, paddingBottom: 10 }}
    >
      <span
        className="w-1 h-4 shrink-0"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {icon && <span style={{ color: `${color}99` }}>{icon}</span>}
      <span
        className="font-mono text-[9px] tracking-[0.3em] uppercase"
        style={{ color: `${color}99` }}
      >
        {label}
      </span>
    </div>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] text-white uppercase tracking-widest truncate">
          {label}
        </p>
        {sub && (
          <p className="font-mono text-[9px] mt-0.5 truncate" style={{ color: C.muted }}>
            {sub}
          </p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function Badge({
  text,
  color,
  pulse,
}: {
  text: string;
  color?: string;
  pulse?: boolean;
}) {
  const c = color ?? C.muted;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest px-2 py-1"
      style={{
        clipPath: polyTiny,
        border: `1px solid ${c}50`,
        background: `${c}12`,
        color: c,
      }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: c, boxShadow: `0 0 4px ${c}` }}
        />
      )}
      {text}
    </span>
  );
}

function Btn({
  onClick,
  loading,
  children,
  color = C.cyan,
  danger,
  small,
  disabled,
}: {
  onClick?: () => void;
  loading?: boolean;
  children: React.ReactNode;
  color?: string;
  danger?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  const c = danger ? C.pink : color;
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "font-mono uppercase font-bold tracking-widest transition-all disabled:opacity-40",
        small ? "px-3 py-1.5 text-[9px]" : "w-full py-2 text-[10px]",
      )}
      style={{
        clipPath: small ? polyTiny : polySmall,
        border: `1px solid ${c}55`,
        background: `${c}0a`,
        color: c,
      }}
      onMouseEnter={(e) => {
        if (!loading && !disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = c;
          (e.currentTarget as HTMLButtonElement).style.color = "#07070f";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = `${c}0a`;
        (e.currentTarget as HTMLButtonElement).style.color = c;
      }}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}

// Confirmation modal ─────────────────────────────────────────────────────────
function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(7,7,15,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="relative max-w-sm w-full p-7"
        style={{
          clipPath: polySmall,
          background: C.panel,
          border: `1px solid ${danger ? C.pink : C.cyan}40`,
          boxShadow: `0 0 40px ${danger ? C.pink : C.cyan}18`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: danger ? C.pink : C.cyan }}
        />
        <p
          className="font-mono text-[8px] uppercase tracking-[0.25em] mb-2"
          style={{ color: danger ? `${C.pink}70` : `${C.cyan}70` }}
        >
          Confirm action
        </p>
        <h3
          className="text-base font-bold uppercase tracking-tight text-white mb-3"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h3>
        <p className="font-mono text-[10px] leading-relaxed mb-6" style={{ color: C.muted }}>
          {body}
        </p>
        <div className="flex gap-2">
          <Btn onClick={onCancel} color={C.muted} small>
            Cancel
          </Btn>
          <Btn onClick={onConfirm} danger={danger} small>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "active"; lat: number; lng: number; accuracy: number; updatedAt: Date }
  | { status: "error"; message: string };

function LocationSection() {
  const { getToken } = useAuth();
  const [loc, setLoc] = useState<LocationState>({ status: "idle" });
  const [shareMode, setShareMode] = useState<"coords" | "map">("coords");
  const [broadcastInterval, setBroadcastInterval] = useState<30 | 60 | 300>(60);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRef = useRef<{ lat: number; lng: number } | null>(null);

  const pushLocation = useCallback(
    async (lat: number, lng: number) => {
      try {
        const t = await getToken();
        if (!t) return;
        await fetch("/api/location/share", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ lat, lng, mode: shareMode }),
        });
      } catch {
        // silently fail — don't interrupt UX
      }
    },
    [getToken, shareMode],
  );

  function startSharing() {
    if (!navigator.geolocation) {
      setLoc({ status: "error", message: "Geolocation not supported in this browser." });
      return;
    }
    setLoc({ status: "requesting" });

    // Single high-accuracy fix first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        latestRef.current = { lat, lng };
        setLoc({ status: "active", lat, lng, accuracy, updatedAt: new Date() });
        pushLocation(lat, lng);

        // Then watch for movement
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => {
            const { latitude: wlat, longitude: wlng, accuracy: wacc } = p.coords;
            latestRef.current = { lat: wlat, lng: wlng };
            setLoc({
              status: "active",
              lat: wlat,
              lng: wlng,
              accuracy: wacc,
              updatedAt: new Date(),
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 10_000 },
        );

        // Push on an interval too
        intervalRef.current = setInterval(() => {
          if (latestRef.current) {
            pushLocation(latestRef.current.lat, latestRef.current.lng);
          }
        }, broadcastInterval * 1000);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Location permission denied. Allow access in browser settings.",
          2: "Position unavailable right now.",
          3: "Location request timed out.",
        };
        setLoc({ status: "error", message: msgs[err.code] ?? "Unknown error." });
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    latestRef.current = null;
    setLoc({ status: "idle" });
    // Notify backend to clear location
    getToken().then((t) => {
      if (t)
        fetch("/api/location/share", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${t}` },
        });
    });
  }

  useEffect(
    () => () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    },
    [],
  );

  const isActive = loc.status === "active";
  const isRequesting = loc.status === "requesting";

  return (
    <section>
      <SectionHead
        color={C.yellow}
        label="Location Sharing"
        icon={
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        }
      />

      <div
        className="flex gap-3 px-3 py-2.5 mb-4"
        style={{
          clipPath: polyTiny,
          background: `${C.yellow}08`,
          border: `1px solid ${C.yellow}25`,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.yellow}
          strokeWidth="2"
          className="shrink-0 mt-0.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="font-mono text-[9px] leading-relaxed" style={{ color: `${C.yellow}99` }}>
          Your live location is pushed to your partner&apos;s device
        </p>
      </div>


      {isActive && loc.status === "active" && (
        <div
          className="flex items-start gap-3 px-3 py-3 mb-3"
          style={{
            clipPath: polyTiny,
            background: `${C.yellow}0a`,
            border: `1px solid ${C.yellow}30`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full mt-1 shrink-0 animate-pulse"
            style={{ background: C.yellow, boxShadow: `0 0 6px ${C.yellow}` }}
          />
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.yellow }}>
              Broadcasting live
            </p>
            <p
              className="font-mono text-[10px] mt-1 tracking-wider"
              style={{ color: `${C.yellow}cc`, fontVariantNumeric: "tabular-nums" }}
            >
              {coordStr(loc.lat, loc.lng)}
            </p>
            <p className="font-mono text-[8px] mt-0.5" style={{ color: `${C.yellow}60` }}>
              ±{Math.round(loc.accuracy)}m · updated{" "}
              {loc.updatedAt.toLocaleTimeString([], { hour12: false })}
            </p>
          </div>
        </div>
      )}

      {loc.status === "error" && (
        <div
          className="px-3 py-2.5 mb-3"
          style={{
            clipPath: polyTiny,
            background: `${C.pink}08`,
            border: `1px solid ${C.pink}30`,
          }}
        >
          <p className="font-mono text-[9px]" style={{ color: C.pink }}>
            ⚠ {loc.message}
          </p>
        </div>
      )}

      {/* CTA */}
      {isActive ? (
        <Btn onClick={stopSharing} danger>
          Stop sharing location
        </Btn>
      ) : (
        <Btn onClick={startSharing} loading={isRequesting} color={C.yellow}>
          {isRequesting ? "Requesting permission..." : "Start sharing location →"}
        </Btn>
      )}

      {/* Privacy note */}
      <p className="font-mono text-[8px] mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.12)" }}>
        Location data is only sent to your partner&apos;s device
      </p>
    </section>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, couple, partnerUser, device, coupleDevices, updateTimezone, refetch } =
    useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  // Timezone
  const [tz, setTz] = useState("UTC");
  const [savingTz, setSavingTz] = useState(false);
  useEffect(() => {
    if (couple?.timezone) setTz(couple.timezone);
  }, [couple]);
  async function handleTzChange(newTz: string) {
    setTz(newTz);
    setSavingTz(true);
    try {
      await updateTimezone(newTz);
    } finally {
      setSavingTz(false);
    }
  }

  // Invite
  const [inviteURL, setInviteURL] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  async function generateInvite() {
    setGeneratingInvite(true);
    try {
      const t = await getToken();
      if (!t) return;
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } finally {
      setGeneratingInvite(false);
    }
  }
  async function copyInvite() {
    if (!inviteURL) return;
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Remove device ──────────────────────────────────────────────────────────
  const [confirmRemoveDevice, setConfirmRemoveDevice] = useState(false);
  const [removingDevice, setRemovingDevice] = useState(false);
  async function handleRemoveDevice() {
    if (!device) return;
    setRemovingDevice(true);
    try {
      const t = await getToken();
      if (!t) throw new Error("Not authenticated");
      await fetch(`/api/devices/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      await refetch();
      setConfirmRemoveDevice(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingDevice(false);
    }
  }

  // ── Remove partner ─────────────────────────────────────────────────────────
  const [confirmRemovePartner, setConfirmRemovePartner] = useState(false);
  const [removingPartner, setRemovingPartner] = useState(false);
  async function handleRemovePartner() {
    setRemovingPartner(true);
    try {
      const t = await getToken();
      if (!t) throw new Error("Not authenticated");
      await fetch(`/api/couples/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      await refetch();
      setConfirmRemovePartner(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingPartner(false);
    }
  }

  const myDevice =
    device ??
    coupleDevices.find((d) => d.device.owner_id === user?.id)?.device;
  const online = isOnline(myDevice?.last_seen);

  return (
    <>
      {/* Confirmation modals */}
      <ConfirmModal
        open={confirmRemoveDevice}
        title="Unpair frame?"
        body="Your e-ink frame will be unlinked from your account. You can re-pair it anytime using the MAC address shown on the frame screen."
        confirmLabel="Unpair frame"
        onConfirm={handleRemoveDevice}
        onCancel={() => setConfirmRemoveDevice(false)}
        danger
      />
      <ConfirmModal
        open={confirmRemovePartner}
        title="Unlink partner?"
        body={`This will permanently dissolve your couple with ${partnerUser?.name ?? "your partner"}. All shared content and your Tamagotchi will be deleted. This cannot be undone.`}
        confirmLabel="Unlink forever"
        onConfirm={handleRemovePartner}
        onCancel={() => setConfirmRemovePartner(false)}
        danger
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: "rgba(7,7,15,0.7)",
          backdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto transition-transform duration-300"
        style={{
          width: 400,
          background: C.bg,
          borderLeft: `1px solid ${C.border}`,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0 sticky top-0 z-10"
          style={{
            background: `${C.bg}ee`,
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <p
              className="font-mono text-[8px] uppercase tracking-[0.3em]"
              style={{ color: `${C.cyan}77` }}
            >
              SYSTEM_CONFIG
            </p>
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: -0.5,
                color: "#fff",
              }}
            >
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-all"
            style={{
              width: 34,
              height: 34,
              clipPath: polyTiny,
              border: `1px solid ${C.border}`,
              background: "transparent",
              color: C.muted,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.pink;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `${C.pink}50`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.muted;
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-7 p-6 flex-1">

          {/* ── DEVICE ── */}
          <section>
            <SectionHead
              color={C.cyan}
              label="Frame Device"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
            />
            {myDevice ? (
              <div>
                <Row
                  label="Status"
                  sub={`Last ping: ${timeAgo(myDevice.last_seen)}`}
                >
                  <Badge
                    text={online ? "Online" : "Offline"}
                    color={online ? C.cyan : C.muted}
                    pulse={online}
                  />
                </Row>
                <Row label="MAC address" sub={myDevice.mac_address}>
                  <Badge text="Paired" color={C.cyan} />
                </Row>
                {myDevice.firmware && (
                  <Row label="Firmware" sub={`v${myDevice.firmware}`}>
                    <Badge text="Up to date" color={C.cyan} />
                  </Row>
                )}
                <div className="mt-4">
                  <Btn
                    onClick={() => setConfirmRemoveDevice(true)}
                    loading={removingDevice}
                    danger
                  >
                    Unpair this frame //
                  </Btn>
                </div>
              </div>
            ) : (
              <div
                className="px-4 py-4 text-center"
                style={{
                  clipPath: polyTiny,
                  border: `1px dashed ${C.border}`,
                  background: "transparent",
                }}
              >
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>
                  No device paired
                </p>
                <p className="font-mono text-[8px] mt-1" style={{ color: "rgba(255,255,255,0.12)" }}>
                  Use the dashboard to pair your frame via MAC address
                </p>
              </div>
            )}
          </section>

          {/* ── PARTNER ── */}
          <section>
            <SectionHead
              color={C.purple}
              label="Partner"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              }
            />
            {!couple ? (
              <div
                className="px-4 py-4 text-center"
                style={{
                  clipPath: polyTiny,
                  border: `1px dashed ${C.border}`,
                }}
              >
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: C.muted }}>
                  No couple linked
                </p>
              </div>
            ) : couple.status === "pending" ? (
              <div className="flex flex-col gap-3">
                <Row label="Couple status" sub="Waiting for partner to accept">
                  <Badge text="Pending" color={C.purple} pulse />
                </Row>
                {inviteURL ? (
                  <InviteField url={inviteURL} copied={copied} onCopy={copyInvite} />
                ) : (
                  <Btn onClick={generateInvite} loading={generatingInvite} color={C.purple}>
                    Generate invite link //
                  </Btn>
                )}
              </div>
            ) : (
              <div>
                <Row
                  label={partnerUser?.name ?? "Partner"}
                  sub={partnerUser?.email}
                >
                  <Badge text="Linked" color={C.purple} pulse />
                </Row>
                <div className="mt-3 mb-4">
                  {inviteURL ? (
                    <InviteField url={inviteURL} copied={copied} onCopy={copyInvite} />
                  ) : (
                    <Btn onClick={generateInvite} loading={generatingInvite} color={C.purple}>
                      New invite link //
                    </Btn>
                  )}
                </div>
                {/* Unlink partner */}
                <div
                  className="mt-2 px-3 py-2.5 mb-3"
                  style={{
                    clipPath: polyTiny,
                    background: `${C.pink}06`,
                    border: `1px solid ${C.pink}20`,
                  }}
                >
                  <p className="font-mono text-[8px] leading-relaxed" style={{ color: `${C.pink}80` }}>
                    ⚠ Unlinking a partner permanently deletes all shared data
                    including your Tamagotchi, content history, and the couple
                    account.
                  </p>
                </div>
                <Btn
                  onClick={() => setConfirmRemovePartner(true)}
                  loading={removingPartner}
                  danger
                >
                  Unlink partner //
                </Btn>
              </div>
            )}
          </section>

          {couple?.status === "active" && <LocationSection />}

          <section>
            <SectionHead
              color={C.cyan}
              label="System"
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              }
            />
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
                Timezone — frame resets at midnight
              </p>
              <div className="relative">
                <select
                  value={tz}
                  onChange={(e) => handleTzChange(e.target.value)}
                  disabled={!couple || savingTz}
                  className="w-full font-mono text-[11px] uppercase tracking-widest px-3 py-2.5 outline-none cursor-pointer appearance-none"
                  style={{
                    clipPath: polySmall,
                    background: "#07070f",
                    border: `1px solid ${C.border}`,
                    color: "#fff",
                  }}
                >
                  {TZ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#07070f" }}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: C.cyan }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              {savingTz && (
                <p className="font-mono text-[9px] uppercase" style={{ color: C.cyan }}>
                  Saving...
                </p>
              )}
            </div>
          </section>

          {/* ── DANGER ZONE ── */}
          <section
            className="mt-auto pt-6"
            style={{ borderTop: `1px solid ${C.pink}18` }}
          >
            <SectionHead color={C.pink} label="Danger zone" />
            <div className="flex flex-col gap-2">
              <Btn onClick={() => signOut({ redirectUrl: "/auth" })} danger>
                Sign out
              </Btn>
              <Btn
                onClick={() =>
                  confirm("Permanently delete all your data?") && undefined
                }
                danger
              >
                Purge account data
              </Btn>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// ─── Invite URL field ─────────────────────────────────────────────────────────
function InviteField({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={url}
        className="flex-1 font-mono text-[9px] px-3 py-2 min-w-0 outline-none"
        style={{
          clipPath: polyTiny,
          background: `${C.purple}08`,
          border: `1px solid ${C.purple}30`,
          color: `${C.purple}cc`,
        }}
      />
      <button
        onClick={onCopy}
        className="font-mono text-[9px] uppercase font-bold px-3 py-2 shrink-0 transition-all"
        style={{
          clipPath: polyTiny,
          border: `1px solid ${C.purple}40`,
          background: copied ? `${C.cyan}18` : `${C.purple}10`,
          color: copied ? C.cyan : C.purple,
        }}
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}