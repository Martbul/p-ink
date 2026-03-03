"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

const polyClip = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

function PairFramePanel({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const [mac, setMac] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handlePair() {
    if (!mac.trim()) return;
    setLoading(true);
    setError("");
    try {
      await pairDevice(mac.trim().toUpperCase());
      setOpen(false);
      onPaired();
    } catch (err) {
      setError((err as Error).message ?? "Uplink failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={() => { if (!open) setOpen(true); }}
      className={`group relative bg-surface-dark border border-neon-blue/30 p-7 transition-all duration-500 hover:border-neon-blue/70 hover:shadow-[0_0_20px_rgba(5,217,232,0.15)] ${!open ? "cursor-pointer" : ""}`}
      style={{ clipPath: polyClip }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(5,217,232,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-neon-blue/10 border border-neon-blue/50 text-neon-blue" style={{ clipPath: polySmall }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-blue/70">INIT_SEQ: 01</p>
              <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Hardware Link</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-surface border border-white/10" style={{ clipPath: polySmall }}>
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Awaiting</span>
          </div>
        </div>
        <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
          &gt; Power up e-ink terminal. Connect to local network. Input displayed MAC sequence below.
        </p>
        {!open ? (
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-blue hover:text-white transition-colors pointer-events-none">
            <span className="w-6 h-6 flex items-center justify-center bg-neon-blue/20 border border-neon-blue/50 group-hover:bg-neon-blue group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>+</span>
            Enter MAC Sequence
          </div>
        ) : (
          <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2">
              <input
                value={mac}
                onChange={(e) => setMac(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="flex-1 bg-bg-dark border border-neon-blue/40 px-4 py-2 text-sm font-mono text-white outline-none focus:border-neon-blue placeholder:text-text-muted/30 uppercase"
                style={{ clipPath: polySmall }}
                onKeyDown={(e) => e.key === "Enter" && handlePair()}
                autoFocus
              />
              <button
                onClick={handlePair}
                disabled={!mac.trim() || loading}
                className="px-6 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue text-xs font-mono font-bold uppercase tracking-widest transition-all hover:bg-neon-blue hover:text-bg-dark disabled:opacity-40"
                style={{ clipPath: polySmall }}
              >
                {loading ? <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin inline-block" /> : "Sync"}
              </button>
            </div>
            {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
            <button onClick={() => setOpen(false)} className="text-[10px] font-mono text-text-muted uppercase hover:text-white text-left mt-2">[ Cancel Operation ]</button>
          </div>
        )}
      </div>
    </div>
  );
}

function InvitePartnerPanel({ onJoined }: { onJoined: () => void }) {
  const { getToken } = useAuth();
  const [inviteURL, setInviteURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Once a key is generated, poll every 4s to detect when partner joins
  useEffect(() => {
    if (!inviteURL) return;
    setWaiting(true);

    pollRef.current = setInterval(async () => {
      try {
        const t = await getToken();
        if (!t) return;
        const me = await api.getMe(t);
        if (me.couple?.status === "active") {
          clearInterval(pollRef.current!);
          setWaiting(false);
          onJoined();
        }
      } catch {
        // non-fatal, keep polling
      }
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [inviteURL, getToken, onJoined]);

  async function generate() {
    if (loading || inviteURL) return;
    setLoading(true);
    setError("");
    try {
      const t = await getToken();
      if (!t) throw new Error("Authentication failure");
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } catch (err) {
      setError((err as Error).message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      onClick={() => { if (!inviteURL && !loading) generate(); }}
      className={`group relative bg-surface-dark border border-neon-purple/30 p-7 transition-all duration-500 hover:border-neon-purple/70 hover:shadow-[0_0_20px_rgba(177,34,229,0.15)] ${!inviteURL && !loading ? "cursor-pointer" : ""}`}
      style={{ clipPath: polyClipReverse }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(177,34,229,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-neon-purple/10 border border-neon-purple/50 text-neon-purple" style={{ clipPath: polySmall }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">INIT_SEQ: 02</p>
              <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Partner Matrix</h3>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 mt-1 px-2 py-1 bg-surface border", waiting ? "border-neon-purple/40" : "border-white/10")} style={{ clipPath: polySmall }}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", waiting ? "bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" : "bg-neon-pink shadow-[0_0_8px_rgba(255,42,109,0.8)]")} />
            <span className={cn("text-[10px] font-mono uppercase tracking-widest", waiting ? "text-neon-purple" : "text-text-muted")}>{waiting ? "Waiting..." : "Offline"}</span>
          </div>
        </div>
        <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
          &gt; Generate encrypted invite channel. Partner joins, nodes connect, terminal activates.
        </p>
        {!inviteURL ? (
          <div className={`flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-purple transition-colors pointer-events-none ${loading ? "opacity-40" : "group-hover:text-white"}`}>
            <span className="w-6 h-6 flex items-center justify-center bg-neon-purple/20 border border-neon-purple/50 group-hover:bg-neon-purple group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>
              {loading ? <span className="w-3 h-3 border border-bg-dark/40 border-t-bg-dark rounded-full animate-spin" /> : "+"}
            </span>
            Generate Key
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-3 py-2 mb-2" style={{ clipPath: polySmall }}>
              <span className="flex-1 text-[10px] font-mono text-white truncate opacity-80 select-all">{inviteURL}</span>
              <button
                onClick={copy}
                className={cn("px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all shrink-0", copied ? "bg-neon-blue/20 text-neon-blue border border-neon-blue" : "bg-neon-purple/20 text-neon-purple border border-neon-purple hover:bg-neon-purple hover:text-bg-dark")}
                style={{ clipPath: polySmall }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {error && <p className="text-[10px] font-mono text-red-400 uppercase mb-1">&gt; ERR: {error}</p>}
            {waiting ? (
              <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-neon-purple/5 border border-neon-purple/20" style={{ clipPath: polySmall }}>
                <span className="w-3 h-3 border border-neon-purple/30 border-t-neon-purple rounded-full animate-spin shrink-0" />
                <p className="text-[10px] font-mono text-neon-purple uppercase tracking-widest">&gt; Listening for partner connection...</p>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-text-muted/50 uppercase">[ Key expires in 168 hours ]</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TodayPrompt() {
  return (
    <div className="relative bg-surface border border-neon-pink/40 p-8 shadow-[0_0_40px_rgba(255,42,109,0.1)] overflow-hidden" style={{ clipPath: polyClip }}>
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-60" />
      <div className="absolute right-0 top-1/2 w-32 h-px bg-gradient-to-l from-neon-pink/50 to-transparent" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6 w-full max-w-sm">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-pink/50" />
          <span className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.3em] animate-pulse">Incoming Transmission</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-pink/50" />
        </div>
        <blockquote className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-snug mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          &quot;If you could relive one moment from the last cycle together, which would it be?&quot;
        </blockquote>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-mono text-[10px] uppercase tracking-widest" style={{ clipPath: polySmall }}>#MEMORY_BANK</span>
        </div>
      </div>
    </div>
  );
}

function YourAnswerCard() {
  const { sendMessage } = useUser();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      await sendMessage(text);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message ?? "Transmission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface-light border-t-2 border-neon-blue p-6 shadow-lg relative" style={{ clipPath: polyClipReverse }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-2 bg-neon-blue shadow-[0_0_8px_rgba(5,217,232,0.8)]" />
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-blue">Local Output</h3>
      </div>
      {submitted ? (
        <div className="bg-bg-dark border border-neon-blue/20 p-5 font-mono" style={{ clipPath: polySmall }}>
          <p className="text-white text-sm mb-4 border-l-2 border-neon-blue pl-3 bg-neon-blue/5 py-2">&gt; {text}</p>
          <p className="flex items-center gap-2 text-[10px] text-neon-blue uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-neon-blue" />Signal uploaded to terminal
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 font-mono text-neon-blue">&gt;</span>
            <textarea
              rows={4}
              placeholder="ENTER_DATA_"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-bg-dark border border-white/10 px-8 py-3 text-sm font-mono text-white resize-none outline-none focus:border-neon-blue placeholder:text-text-muted/30"
              style={{ clipPath: polySmall }}
            />
          </div>
          {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
          <button
            onClick={submit}
            disabled={!text.trim() || loading}
            className="w-full py-3 bg-neon-blue/10 border-2 border-neon-blue text-neon-blue font-mono font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-bg-dark transition-all disabled:opacity-40"
            style={{ clipPath: polySmall }}
          >
            {loading ? "Transmitting..." : "Send Data //"}
          </button>
        </div>
      )}
    </div>
  );
}

function PartnerAnswerCard({ partnerName }: { partnerName: string }) {
  const { content, user } = useUser();
  const latest = content.find((c) => c.type === "message" && c.sent_to === user?.id);

  return (
    <div className="bg-surface-light border-t-2 border-neon-purple p-6 shadow-lg relative" style={{ clipPath: polyClip }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-2 bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" />
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-purple">Remote Input: [{partnerName}]</h3>
      </div>
      {latest?.message_text ? (
        <div className="bg-bg-dark border border-neon-purple/20 p-5 font-mono" style={{ clipPath: polySmall }}>
          <p className="text-white text-sm border-l-2 border-neon-purple pl-3 bg-neon-purple/5 py-2">&gt; {latest.message_text}</p>
        </div>
      ) : (
        <div className="bg-bg-dark border border-dashed border-white/10 p-5 flex items-center gap-4 font-mono" style={{ clipPath: polySmall }}>
          <div className="flex gap-1 shrink-0">
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="w-2 h-2 bg-neon-purple/50 animate-pulse" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
          <p className="text-xs text-text-muted uppercase tracking-widest">Awaiting Signal...</p>
        </div>
      )}
    </div>
  );
}

function FrameStrip() {
  const { device } = useUser();
  if (!device) return null;
  const online = device.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-surface border-l-4 border-white/10" style={{ borderLeftColor: online ? '#05d9e8' : '#ff2a6d' }}>
      <div className="flex items-center gap-4">
        <span className={cn("w-3 h-3 border", online ? "bg-neon-blue/20 border-neon-blue shadow-[0_0_10px_rgba(5,217,232,0.8)]" : "bg-neon-pink/20 border-neon-pink")} />
        <span className="font-mono text-xs uppercase tracking-widest text-white">Hardware Node</span>
        <span className="text-[10px] text-text-muted font-mono hidden sm:block bg-bg-dark px-2 py-0.5 border border-white/5">{device.mac_address}</span>
      </div>
      <div className="flex items-center gap-4">
        {device.last_seen && (
          <span className="text-[10px] font-mono text-text-muted hidden sm:block">
            LAST_PING: {new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        )}
        <span className={cn("text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-widest border", online ? "text-neon-blue border-neon-blue/30 bg-neon-blue/10" : "text-neon-pink border-neon-pink/30 bg-neon-pink/10")}>
          {online ? "Sys_Active" : "Sys_Offline"}
        </span>
      </div>
    </div>
  );
}

// ─── NEW: Post-sync connection status panel (replaces the "waiting" state) ───
function SyncedConnectionPanel({ partnerName, partnerUser }: { partnerName: string; partnerUser: { name: string; email: string } | null }) {
  const { device, coupleDevices, user } = useUser();

  const myDevice = coupleDevices.find((d) => d.device.owner_id === user?.id);
  const partnerDevice = coupleDevices.find((d) => d.device.owner_id !== user?.id);

  const myOnline = myDevice?.device?.last_seen
    ? Date.now() - new Date(myDevice.device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  const partnerOnline = partnerDevice?.device?.last_seen
    ? Date.now() - new Date(partnerDevice.device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  return (
    <div className="animate-fade-up">
      {/* Success banner */}
      <div className="relative bg-surface border border-neon-blue/40 p-6 mb-6 overflow-hidden" style={{ clipPath: polyClip }}>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(5,217,232,0.05)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-blue via-neon-purple to-neon-pink opacity-80" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center bg-neon-blue/20 border border-neon-blue shadow-[0_0_15px_rgba(5,217,232,0.4)]" style={{ clipPath: polySmall }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#05d9e8" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-neon-blue mb-0.5">MATRIX_STATUS // SYNCED</p>
              <p className="font-display text-lg font-black text-white uppercase tracking-wide">
                Link established with <span className="text-neon-blue">{partnerName}</span>
              </p>
            </div>
          </div>
          <Link
            href="/device"
            className="flex items-center gap-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/50 text-neon-blue font-mono text-[10px] uppercase tracking-widest hover:bg-neon-blue hover:text-bg-dark transition-all"
            style={{ clipPath: polySmall }}
          >
            Manage Device
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Two-device status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My terminal */}
        <div className={cn("relative bg-surface-dark border p-5 transition-all", myOnline ? "border-neon-blue/40 shadow-[0_0_15px_rgba(5,217,232,0.08)]" : "border-white/10")} style={{ clipPath: polyClip }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-blue/70 mb-1">LOCAL_NODE</p>
              <h4 className="font-display text-base font-black text-white uppercase tracking-wide">My Terminal</h4>
            </div>
            <div className={cn("flex items-center gap-1.5 px-2 py-1 border", myOnline ? "border-neon-blue/40 bg-neon-blue/10" : "border-white/10 bg-surface")} style={{ clipPath: polySmall }}>
              <span className={cn("w-1.5 h-1.5 rounded-full", myOnline ? "bg-neon-blue shadow-[0_0_6px_rgba(5,217,232,0.8)] animate-pulse" : "bg-white/30")} />
              <span className={cn("font-mono text-[9px] uppercase tracking-widest", myOnline ? "text-neon-blue" : "text-text-muted")}>
                {myOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {myDevice ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">MAC_ID</span>
                <span className="font-mono text-[10px] text-white">{myDevice.device.mac_address}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">Last Ping</span>
                <span className="font-mono text-[10px] text-white">
                  {myDevice.device.last_seen
                    ? new Date(myDevice.device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">Firmware</span>
                <span className="font-mono text-[10px] text-neon-blue">{myDevice.device.firmware ?? "Unknown"}</span>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest border border-dashed border-white/10 px-3 py-2">
              &gt; No hardware linked. Pair from dashboard.
            </p>
          )}
        </div>

        {/* Partner terminal */}
        <div className={cn("relative bg-surface-dark border p-5 transition-all", partnerOnline ? "border-neon-purple/40 shadow-[0_0_15px_rgba(177,34,229,0.08)]" : "border-white/10")} style={{ clipPath: polyClipReverse }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70 mb-1">REMOTE_NODE</p>
              <h4 className="font-display text-base font-black text-white uppercase tracking-wide">{partnerName}&apos;s Terminal</h4>
            </div>
            <div className={cn("flex items-center gap-1.5 px-2 py-1 border", partnerOnline ? "border-neon-purple/40 bg-neon-purple/10" : "border-white/10 bg-surface")} style={{ clipPath: polySmall }}>
              <span className={cn("w-1.5 h-1.5 rounded-full", partnerOnline ? "bg-neon-purple shadow-[0_0_6px_rgba(177,34,229,0.8)] animate-pulse" : "bg-white/30")} />
              <span className={cn("font-mono text-[9px] uppercase tracking-widest", partnerOnline ? "text-neon-purple" : "text-text-muted")}>
                {partnerOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {partnerDevice ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">MAC_ID</span>
                <span className="font-mono text-[10px] text-white">{partnerDevice.device.mac_address}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">Last Ping</span>
                <span className="font-mono text-[10px] text-white">
                  {partnerDevice.device.last_seen
                    ? new Date(partnerDevice.device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-mono text-[9px] text-text-muted uppercase tracking-widest">Firmware</span>
                <span className="font-mono text-[10px] text-neon-purple">{partnerDevice.device.firmware ?? "Unknown"}</span>
              </div>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest border border-dashed border-white/10 px-3 py-2">
              &gt; Partner has not paired their terminal yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, couple, partnerUser, device, isLoading, error, refetch } = useUser();

  const [justPaired, setJustPaired] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  // Poll for couple status when pending (joiner side: just accepted invite but couple
  // hasn't activated yet, or creator waiting for partner after page refresh).
  useEffect(() => {
    if (!couple || couple.status === "active") return;
    const id = setInterval(() => refetch(), 5000);
    return () => clearInterval(id);
  }, [couple?.status, refetch]);

  // Flash "just paired" banner when couple transitions to active
  useEffect(() => {
    if (couple?.status === "active" && prevStatusRef.current && prevStatusRef.current !== "active") {
      setJustPaired(true);
      setTimeout(() => setJustPaired(false), 5000);
    }
    prevStatusRef.current = couple?.status ?? null;
  }, [couple?.status]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "2-digit", day: "2-digit", year: "numeric"
  }).replace(/,/g, "").replace(/\//g, ".");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-bg-dark font-mono text-neon-blue uppercase tracking-widest gap-4">
          <Spinner />
          <span>&gt; Accessing Matrix...</span>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 bg-red-900/20 border border-red-500 text-red-400 font-mono text-sm uppercase m-8" style={{ clipPath: polySmall }}>
          &gt; FATAL_ERR: {error}
        </div>
      </AppLayout>
    );
  }

  const firstName = user?.name?.split(" ")[0]?.toUpperCase() ?? "USER";
  const lastName = user?.name?.split(" ").slice(1).join(" ") ?? "";
  const partnerName = partnerUser?.name?.split(" ")[0]?.toUpperCase() ?? "UNKNOWN_NODE";
  const coupleActive = couple?.status === "active";
  const needsPairing = !device;
  const needsInvite = !coupleActive;

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-dark text-white relative selection:bg-neon-blue/30 selection:text-white pt-12 pb-24">
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 animate-fade-in">

          <div className="mb-12 border-b border-white/10 pb-8 relative">
            <div className="absolute left-0 bottom-0 w-1/3 h-px bg-gradient-to-r from-neon-blue to-transparent" />
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-blue block" />
              SYSTEM_TIME: {today}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              User_Link: <span className="text-neon-blue text-glow-blue italic">[{firstName} {lastName}]</span>
            </h1>
            {coupleActive && (
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-neon-purple pl-3 py-1 bg-neon-purple/5">
                Matrix synced with <span className="text-neon-purple">{partnerName}</span>.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-8">

            {/* ─── Pair success flash banner ─── */}
            {justPaired && (
              <div className="animate-fade-up flex items-center gap-4 px-5 py-4 bg-neon-purple/10 border border-neon-purple shadow-[0_0_30px_rgba(177,34,229,0.2)]" style={{ clipPath: polySmall }}>
                <span className="w-3 h-3 bg-neon-purple shadow-[0_0_10px_rgba(177,34,229,0.8)] animate-pulse shrink-0" />
                <p className="font-mono text-xs uppercase tracking-widest text-neon-purple">
                  &gt; Link established — partner node connected. Matrix is now active.
                </p>
              </div>
            )}

            {/* Setup panels (if needed) */}
            {(needsPairing || needsInvite) && (
              <div className="animate-fade-up delay-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-white/20" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted">Initialization Required</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {needsPairing && <PairFramePanel onPaired={() => refetch()} />}
                  {needsInvite && <InvitePartnerPanel onJoined={() => refetch()} />}
                </div>
              </div>
            )}

            {/* Active system content */}
            {coupleActive && (
              <div className="flex flex-col gap-8 animate-fade-up delay-200">
                <TodayPrompt />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <YourAnswerCard />
                  <PartnerAnswerCard partnerName={partnerName} />
                </div>
                <FrameStrip />
              </div>
            )}

            {/* ─── REPLACED: Connection status panel (replaces the old "waiting" state) ─── */}
            {!coupleActive && (
              <div className="mt-4">
                {/* Show connection info if we have a partner already synced, otherwise show waiting */}
                {couple && couple.status !== "active" ? (
                  <div className="mt-8 border border-dashed border-white/20 bg-surface/30 p-12 text-center animate-pulse" style={{ clipPath: polyClip }}>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted/60">
                      &gt; Waiting for remote node connection... <br />
                      &gt; Diurnal prompts will initialize post-sync.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* ─── Connection status shown AFTER couple goes active but before full content loads ─── */}
            {coupleActive && (
              <SyncedConnectionPanel
                partnerName={partnerName}
                partnerUser={partnerUser ? { name: partnerUser.name, email: partnerUser.email } : null}
              />
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}