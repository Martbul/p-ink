"use client";

/**
 * SettingsPanel
 *
 * Slide-over panel (not a route). Contains:
 *   - Device: label, MAC, online status, firmware
 *   - Partner: linked user, generate new invite
 *   - System: timezone
 *   - Danger: sign out, purge
 *
 * Triggered by the gear icon in AppLayout's TopBar.
 */

import { useState, useEffect } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api/api";
import { cn } from "@/lib/utils";

const polySmall = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
const polyTiny  = "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

const TZ_OPTIONS = [
  { value: "Europe/Sofia",        label: "EU // SOFIA"        },
  { value: "Europe/London",       label: "EU // LONDON"       },
  { value: "Europe/Paris",        label: "EU // PARIS"        },
  { value: "America/New_York",    label: "NA // NEW_YORK"     },
  { value: "America/Los_Angeles", label: "NA // LOS_ANGELES"  },
  { value: "Asia/Tokyo",          label: "AS // TOKYO"        },
  { value: "Australia/Sydney",    label: "OC // SYDNEY"       },
];

function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="flex items-center gap-2 mb-3"
      style={{ borderBottom: `1px solid ${color}18`, paddingBottom: 10 }}
    >
      <span className="w-1 h-4" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: `${color}aa` }}>
        {label}
      </span>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────
function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="min-w-0">
        <p className="font-mono text-[10px] text-white uppercase tracking-widest truncate">{label}</p>
        {sub && <p className="font-mono text-[9px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.25)" }}>{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ text, online }: { text: string; online?: boolean }) {
  const color = online ? "#05d9e8" : "rgba(255,255,255,0.2)";
  return (
    <span
      className="font-mono text-[9px] uppercase tracking-widest px-2 py-1"
      style={{
        clipPath: polyTiny,
        border: `1px solid ${color}60`,
        background: `${color}12`,
        color,
      }}
    >
      {text}
    </span>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────
function ActionBtn({
  onClick,
  loading,
  children,
  color = "#05d9e8",
  danger,
}: {
  onClick?: () => void;
  loading?: boolean;
  children: React.ReactNode;
  color?: string;
  danger?: boolean;
}) {
  const c = danger ? "#ff2a6d" : color;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-40"
      style={{
        clipPath: polySmall,
        border: `1px solid ${c}50`,
        background: `${c}0a`,
        color: c,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = c;
        (e.currentTarget as HTMLButtonElement).style.color = "#07070f";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `${c}0a`;
        (e.currentTarget as HTMLButtonElement).style.color = c;
      }}
    >
      {loading ? "Processing..." : children}
    </button>
  );
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    user, couple, partnerUser, device, coupleDevices,
    updateTimezone, createCouple, refetch,
  } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  // Timezone
  const [tz, setTz] = useState("UTC");
  const [savingTz, setSavingTz] = useState(false);
  useEffect(() => { if (couple?.timezone) setTz(couple.timezone); }, [couple]);

  async function handleTzChange(newTz: string) {
    setTz(newTz);
    setSavingTz(true);
    try { await updateTimezone(newTz); } finally { setSavingTz(false); }
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
    } finally { setGeneratingInvite(false); }
  }

  async function copyInvite() {
    if (!inviteURL) return;
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const myDevice = device ?? coupleDevices.find(d => d.device.owner_id === user?.id)?.device;
  const online   = isOnline(myDevice?.last_seen);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: "rgba(7,7,15,0.65)",
          backdropFilter: "blur(6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-y-auto transition-transform duration-300"
        style={{
          width: 380,
          background: "#0a0a17",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "#05d9e888" }}>
              SYSTEM_CONFIG
            </p>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: "#fff" }}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32, height: 32,
              clipPath: polyTiny,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "rgba(255,255,255,0.3)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ff2a6d"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#ff2a6d50"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6 flex-1">

          {/* ── Device ── */}
          <section>
            <SectionHead color="#05d9e8" label="Device" />
            {myDevice ? (
              <>
                <Row label="Status" sub={`Last ping: ${myDevice.last_seen ? new Date(myDevice.last_seen).toLocaleTimeString([], { hour12: false }) : "never"}`}>
                  <Badge text={online ? "Online" : "Offline"} online={online} />
                </Row>
                <Row label="MAC address" sub={myDevice.mac_address}>
                  <Badge text="Paired" online />
                </Row>
                {myDevice.firmware && (
                  <Row label="Firmware" sub={`v${myDevice.firmware}`}>
                    <Badge text="Up to date" />
                  </Row>
                )}
              </>
            ) : (
              <Row label="No device linked" sub="Pair your e-ink frame from the home screen">
                <Badge text="Unpaired" />
              </Row>
            )}
          </section>

          {/* ── Partner ── */}
          <section>
            <SectionHead color="#b122e5" label="Partner" />
            {!couple ? (
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                No couple linked — complete setup on the home screen.
              </p>
            ) : couple.status === "pending" ? (
              <div className="flex flex-col gap-3">
                <Row label="Couple status" sub="Waiting for partner to accept invite">
                  <Badge text="Pending" />
                </Row>
                {inviteURL ? (
                  <div className="flex gap-2">
                    <input
                      readOnly value={inviteURL}
                      className="flex-1 font-mono text-[9px] px-3 py-2 min-w-0"
                      style={{
                        clipPath: polyTiny,
                        background: "rgba(177,34,229,0.06)",
                        border: "1px solid rgba(177,34,229,0.3)",
                        color: "rgba(177,34,229,0.8)",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={copyInvite}
                      className="font-mono text-[9px] uppercase font-bold px-3 py-2 shrink-0 transition-all"
                      style={{
                        clipPath: polyTiny,
                        border: "1px solid rgba(177,34,229,0.4)",
                        background: copied ? "rgba(5,217,232,0.15)" : "rgba(177,34,229,0.1)",
                        color: copied ? "#05d9e8" : "#b122e5",
                      }}
                    >
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                ) : (
                  <ActionBtn onClick={generateInvite} loading={generatingInvite} color="#b122e5">
                    Generate invite key //
                  </ActionBtn>
                )}
              </div>
            ) : (
              <>
                <Row
                  label={partnerUser?.name ?? "Partner"}
                  sub={partnerUser?.email}
                >
                  <Badge text="Linked" online />
                </Row>
                <div className="mt-2">
                  {inviteURL ? (
                    <div className="flex gap-2">
                      <input
                        readOnly value={inviteURL}
                        className="flex-1 font-mono text-[9px] px-3 py-2 min-w-0"
                        style={{
                          clipPath: polyTiny,
                          background: "rgba(177,34,229,0.06)",
                          border: "1px solid rgba(177,34,229,0.3)",
                          color: "rgba(177,34,229,0.8)",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={copyInvite}
                        className="font-mono text-[9px] uppercase font-bold px-3 py-2 shrink-0 transition-all"
                        style={{
                          clipPath: polyTiny,
                          border: "1px solid rgba(177,34,229,0.4)",
                          background: copied ? "rgba(5,217,232,0.15)" : "rgba(177,34,229,0.1)",
                          color: copied ? "#05d9e8" : "#b122e5",
                        }}
                      >
                        {copied ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <ActionBtn onClick={generateInvite} loading={generatingInvite} color="#b122e5">
                      New invite key //
                    </ActionBtn>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ── System ── */}
          <section>
            <SectionHead color="#05d9e8" label="System" />
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                Timezone — resets frame at midnight
              </p>
              <select
                value={tz}
                onChange={e => handleTzChange(e.target.value)}
                disabled={!couple || savingTz}
                className="w-full font-mono text-[11px] uppercase tracking-widest px-3 py-2 outline-none cursor-pointer"
                style={{
                  clipPath: polySmall,
                  background: "#07070f",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
              >
                {TZ_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: "#07070f", color: "#fff" }}>
                    {o.label}
                  </option>
                ))}
              </select>
              {savingTz && (
                <p className="font-mono text-[9px] uppercase" style={{ color: "#05d9e8" }}>Saving...</p>
              )}
            </div>
          </section>

          {/* ── Danger ── */}
          <section className="mt-auto pt-6" style={{ borderTop: "1px solid rgba(255,42,109,0.12)" }}>
            <SectionHead color="#ff2a6d" label="Danger zone" />
            <div className="flex flex-col gap-2 mt-2">
              <ActionBtn
                onClick={() => signOut({ redirectUrl: "/auth" })}
                danger
              >
                Sign out
              </ActionBtn>
              <ActionBtn
                onClick={() => confirm("Permanently delete all your data?") && undefined}
                danger
              >
                Purge account data
              </ActionBtn>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}