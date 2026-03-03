"use client";
import { useState, useEffect } from "react";
import { useClerk, useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api";
import { cn } from "@/lib/utils";

const polyClip =
  "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polySmall =
  "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
}

function CyberPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-surface-dark border border-white/10 p-6 relative mb-8 hover:border-white/20 transition-colors" style={{ clipPath: polyClip }}>
      <div className="absolute top-0 left-0 w-1/4 h-px bg-gradient-to-r from-neon-blue to-transparent" />
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-neon-blue mb-6 pb-2 border-b border-white/5 flex items-center gap-2">
        <span className="w-2 h-2 bg-neon-blue inline-block" />{title}
      </h2>
      {children}
    </div>
  );
}

function CyberRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-b border-white/5 last:border-none">
      <div>
        <p className="font-display text-sm uppercase tracking-wider text-white">{label}</p>
        {sub && <p className="font-mono text-[10px] text-text-muted mt-1 uppercase tracking-widest leading-relaxed">&gt; {sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function CyberInput({ value, onChange, disabled, type = "text", placeholder = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder}
      className="w-full bg-bg-dark border border-white/20 px-4 py-3 font-mono text-sm text-white focus:border-neon-pink focus:outline-none disabled:opacity-50 disabled:bg-surface transition-colors"
      style={{ clipPath: polySmall }} />
  );
}

function CyberButton({ onClick, loading, children, variant = "primary", type = "button" }: {
  onClick?: () => void; loading?: boolean; children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger"; type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "bg-neon-pink/10 border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-white shadow-[0_0_10px_rgba(255,42,109,0.2)]",
    secondary: "bg-surface border-white/20 text-text-muted hover:border-neon-blue hover:text-neon-blue hover:bg-neon-blue/10",
    danger: "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]",
  };
  return (
    <button type={type} onClick={onClick} disabled={loading}
      className={cn("px-6 py-2 border font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50", styles[variant as keyof typeof styles])}
      style={{ clipPath: polySmall }}>
      {loading ? <span className="animate-pulse">PROCESSING...</span> : children}
    </button>
  );
}

function CyberToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange}
      className={cn("w-14 h-6 border flex items-center px-1 transition-colors relative", checked ? "border-neon-blue bg-neon-blue/10" : "border-white/20 bg-bg-dark")}
      style={{ clipPath: polySmall }}>
      <div className={cn("absolute w-4 h-4 transition-all duration-300", checked ? "bg-neon-blue left-[34px] shadow-[0_0_8px_rgba(5,217,232,0.8)]" : "bg-white/30 left-1")}
        style={{ clipPath: polySmall }} />
    </button>
  );
}

function CyberBadge({ text, status }: { text: string; status: "online" | "offline" | "neutral" }) {
  const colors = {
    online: "text-neon-blue border-neon-blue bg-neon-blue/10",
    offline: "text-red-400 border-red-400/50 bg-red-400/10",
    neutral: "text-text-muted border-white/20 bg-surface",
  };
  return (
    <span className={cn("px-3 py-1.5 border font-mono text-[9px] uppercase tracking-widest block text-center", colors[status])}
      style={{ clipPath: polySmall }}>[{text}]</span>
  );
}

const TZ_OPTIONS = [
  { value: "Europe/Sofia", label: "EU // SOFIA" },
  { value: "Europe/London", label: "EU // LONDON" },
  { value: "America/New_York", label: "NA // NEW_YORK" },
  { value: "America/Los_Angeles", label: "NA // LOS_ANGELES" },
  { value: "Asia/Tokyo", label: "AS // TOKYO" },
  { value: "Australia/Sydney", label: "OC // SYDNEY" },
];

export default function SettingsPage() {
  const { user, couple, partnerUser, device, coupleDevices, isLoading, updateTimezone, createCouple } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (user) setName(user.name); }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  const [inviteURL, setInviteURL] = useState("");
  const [copied, setCopied] = useState(false);
  const [creatingCouple, setCreatingCouple] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  async function handleCreateCouple() {
    setCreatingCouple(true);
    try { await createCouple(); } finally { setCreatingCouple(false); }
  }

  async function handleGenerateInvite() {
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
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const [tz, setTz] = useState("UTC");
  const [savingTz, setSavingTz] = useState(false);
  useEffect(() => { if (couple?.timezone) setTz(couple.timezone); }, [couple]);
  async function handleTzChange(newTz: string) {
    setTz(newTz); setSavingTz(true);
    try { await updateTimezone(newTz); } finally { setSavingTz(false); }
  }

  const [notifs, setNotifs] = useState(true);
  const [reminder, setReminder] = useState(true);

  // Derive partner device from coupleDevices.
  const myDevice = coupleDevices.find((d) => d.device.owner_id === user?.id);
  const partnerDevice = coupleDevices.find((d) => d.device.owner_id !== user?.id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 text-neon-blue font-mono text-xs uppercase tracking-widest gap-4">
          <Spinner />&gt; Loading System Preferences...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-dark text-white pt-12 pb-24 relative">
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />
        <div className="max-w-2xl mx-auto px-6 relative z-10 animate-fade-in">

          <div className="mb-10 border-b border-white/10 pb-8">
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-blue block" />SYSTEM_CONFIG
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              Hardware & <span className="text-neon-blue text-glow-blue italic">Profile.</span>
            </h1>
          </div>

          {/* 1. Profile */}
          <CyberPanel title="LOCAL_USER_DATA">
            <form onSubmit={saveProfile} className="flex flex-col gap-5">
              <div>
                <label className="block font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">Display ID</label>
                <CyberInput value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">Network Alias (Email)</label>
                <CyberInput type="email" value={user?.email ?? ""} onChange={() => {}} placeholder={user?.email ?? ""} disabled />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <CyberButton type="submit" loading={saving}>Update Registry</CyberButton>
                {saved && (
                  <span className="font-mono text-[10px] text-neon-blue uppercase tracking-widest animate-pulse flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-neon-blue inline-block" />LOG_SAVED
                  </span>
                )}
              </div>
            </form>
          </CyberPanel>

          {/* 2. Partner / Matrix */}
          <CyberPanel title="MATRIX_CONNECTION">
            {!couple ? (
              <div className="flex flex-col gap-4 items-start">
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest leading-relaxed border-l-2 border-red-500/50 pl-3 py-1">
                  &gt; ERR: No remote node linked.<br />&gt; Generate a matrix instance to invite partner.
                </p>
                <CyberButton onClick={handleCreateCouple} loading={creatingCouple}>Initialize Matrix</CyberButton>
              </div>
            ) : couple.status === "pending" ? (
              <div className="flex flex-col gap-4">
                <p className="font-mono text-[10px] text-yellow-400 uppercase tracking-widest animate-pulse flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-400 block rounded-full" />AWAITING REMOTE UPLINK...
                </p>
                {inviteURL ? (
                  <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-4 py-3" style={{ clipPath: polySmall }}>
                    <span className="flex-1 font-mono text-[10px] text-white opacity-80 truncate select-all">{inviteURL}</span>
                    <button onClick={copyInvite}
                      className={cn("px-4 py-1.5 font-mono text-[9px] uppercase font-bold tracking-widest border transition-all", copied ? "bg-neon-blue/20 text-neon-blue border-neon-blue" : "bg-neon-purple/20 text-neon-purple border-neon-purple hover:bg-neon-purple hover:text-white")}
                      style={{ clipPath: polySmall }}>{copied ? "COPIED" : "COPY_KEY"}</button>
                  </div>
                ) : (
                  <CyberButton onClick={handleGenerateInvite} loading={generatingInvite} variant="secondary">Generate Handshake Key</CyberButton>
                )}
              </div>
            ) : (
              <>
                <CyberRow label={partnerUser?.name ?? "REMOTE_NODE"}
                  sub={"ID: " + (partnerUser?.email ?? "UNKNOWN") + " // LINKED: " + new Date(couple.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}>
                  <CyberBadge text="SYS_SYNCED" status="online" />
                </CyberRow>
                <div className="mt-6 pt-5 border-t border-white/5">
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">Force New Key Generation</p>
                  {inviteURL ? (
                    <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-4 py-3" style={{ clipPath: polySmall }}>
                      <span className="flex-1 font-mono text-[10px] text-white opacity-80 truncate">{inviteURL}</span>
                      <button onClick={copyInvite}
                        className={cn("px-4 py-1.5 font-mono text-[9px] uppercase font-bold tracking-widest border transition-all", copied ? "bg-neon-blue/20 text-neon-blue border-neon-blue" : "bg-neon-purple/20 text-neon-purple border-neon-purple hover:bg-neon-purple hover:text-white")}
                        style={{ clipPath: polySmall }}>{copied ? "COPIED" : "COPY_KEY"}</button>
                    </div>
                  ) : (
                    <CyberButton onClick={handleGenerateInvite} loading={generatingInvite} variant="secondary">Generate Handshake Key</CyberButton>
                  )}
                </div>
              </>
            )}
          </CyberPanel>

          {/* 3. Hardware Terminals — one per partner */}
          <CyberPanel title="HARDWARE_TERMINALS">
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-6 border-l-2 border-neon-blue/40 pl-3 py-1 bg-neon-blue/5">
              &gt; Each partner has their own e-ink terminal. A couple has two devices total.
            </p>

            <CyberRow label="Server Timezone" sub="Determines 00:00 cycle reset for the couple">
              <select className="bg-bg-dark border border-white/20 text-white font-mono text-[10px] uppercase tracking-widest px-4 py-2 outline-none focus:border-neon-blue hover:border-white/40 cursor-pointer"
                style={{ clipPath: polySmall }} value={tz} onChange={(e) => handleTzChange(e.target.value)}
                disabled={!couple || savingTz}>
                {TZ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-bg-dark text-white">{o.label}</option>
                ))}
              </select>
            </CyberRow>

            {/* My device */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="font-mono text-[10px] text-neon-blue uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-neon-blue" />MY TERMINAL
              </p>
              {myDevice ? (
                <>
                  <CyberRow label="MAC_ADDRESS_ID"
                    sub={myDevice.device.mac_address + " // LAST_PING: " + (myDevice.device.last_seen ? new Date(myDevice.device.last_seen).toLocaleTimeString([], { hour12: false }) : "OFFLINE")}>
                    <CyberBadge text={isOnline(myDevice.device.last_seen) ? "ONLINE" : "OFFLINE"} status={isOnline(myDevice.device.last_seen) ? "online" : "offline"} />
                  </CyberRow>
                  <CyberRow label="Firmware Version" sub={"VER // " + (myDevice.device.firmware ?? "UNKNOWN")}>
                    <CyberBadge text="UP_TO_DATE" status="neutral" />
                  </CyberRow>
                </>
              ) : (
                <CyberRow label="No Terminal Linked" sub="Pair your e-ink frame from the dashboard.">
                  <CyberBadge text="UNPAIRED" status="offline" />
                </CyberRow>
              )}
            </div>

            {/* Partner device */}
            {couple?.status === "active" && (
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="font-mono text-[10px] text-neon-purple uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-neon-purple" />PARTNER TERMINAL [{(partnerUser?.name ?? "REMOTE_NODE").toUpperCase()}]
                </p>
                {partnerDevice ? (
                  <>
                    <CyberRow label="MAC_ADDRESS_ID"
                      sub={partnerDevice.device.mac_address + " // LAST_PING: " + (partnerDevice.device.last_seen ? new Date(partnerDevice.device.last_seen).toLocaleTimeString([], { hour12: false }) : "OFFLINE")}>
                      <CyberBadge text={isOnline(partnerDevice.device.last_seen) ? "ONLINE" : "OFFLINE"} status={isOnline(partnerDevice.device.last_seen) ? "online" : "offline"} />
                    </CyberRow>
                    <CyberRow label="Firmware Version" sub={"VER // " + (partnerDevice.device.firmware ?? "UNKNOWN")}>
                      <CyberBadge text="UP_TO_DATE" status="neutral" />
                    </CyberRow>
                  </>
                ) : (
                  <CyberRow label="Partner has not paired their terminal yet" sub="They can pair their device from their dashboard.">
                    <CyberBadge text="UNPAIRED" status="offline" />
                  </CyberRow>
                )}
              </div>
            )}
          </CyberPanel>

          {/* 4. Notifications */}
          <CyberPanel title="SYSTEM_ALERTS">
            <CyberRow label="Push Notifications" sub="Receive ping when remote node transmits data">
              <CyberToggle checked={notifs} onChange={() => setNotifs((v) => !v)} />
            </CyberRow>
            <CyberRow label="Diurnal Reminder" sub="Automated prompt at 20:00 local server time">
              <CyberToggle checked={reminder} onChange={() => setReminder((v) => !v)} />
            </CyberRow>
          </CyberPanel>

          {/* 5. Danger Zone */}
          <div className="mt-12 pt-8 border-t border-red-500/20">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-red-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 inline-block animate-pulse" />DANGER_ZONE
            </h2>
            <div className="bg-red-500/5 border border-red-500/20 p-6" style={{ clipPath: polyClip }}>
              <CyberRow label="Terminate Session" sub="Clear local credentials and disconnect">
                <CyberButton variant="secondary" onClick={() => signOut({ redirectUrl: "/auth" })}>Sign Out</CyberButton>
              </CyberRow>
              <CyberRow label="Purge Account Data" sub="Permanently erase all matrices, memories, and hardware links">
                <CyberButton onClick={() => confirm("Purge account?") && undefined} variant="danger">Execute Purge</CyberButton>
              </CyberRow>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}