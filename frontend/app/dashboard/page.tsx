"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { useModal, ModalPresets } from "@/components/ui/info_modal";
import { api } from "@/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Clip paths ───────────────────────────────────────────────────────────────
const polyClip        = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall       = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

// ─── QR Code ──────────────────────────────────────────────────────────────────
function QRCode({ url, size = 160 }: { url: string; size?: number }) {
  const src = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|1`;
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-white border border-neon-purple/30" style={{ clipPath: polySmall }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Invite QR code" width={size} height={size} className="block" style={{ imageRendering: "pixelated" }} />
      <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest text-center">Scan to join</p>
    </div>
  );
}

// ─── Pair Frame Panel ─────────────────────────────────────────────────────────
function PairFramePanel({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const modal = useModal();
  const [mac, setMac]         = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);

  async function handlePair() {
    if (!mac.trim()) return;
    setLoading(true);
    try {
      await pairDevice(mac.trim().toUpperCase());
      setOpen(false);

      // ── Success modal ──────────────────────────────────────────────────────
      modal.open({
        ...ModalPresets.pairSuccess(mac.trim().toUpperCase()),
        actions: [
          {
            label: "Continue →",
            variant: "primary",
            onClick: () => {
              modal.close();
              onPaired();
            },
          },
        ],
      });
    } catch (err) {
      const reason = (err as Error).message ?? "Uplink failed";

      // ── Error modal ────────────────────────────────────────────────────────
      modal.open({
        ...ModalPresets.pairError(reason),
        actions: [
          {
            label: "Dismiss",
            variant: "secondary",
            onClick: () => modal.close(),
          },
          {
            label: "Retry →",
            variant: "primary",
            onClick: () => {
              modal.close();
              setOpen(true);
            },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {modal.Modal}

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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
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
          <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">&gt; Power up e-ink terminal. Connect to local network. Input displayed MAC sequence below.</p>
          {!open ? (
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-blue hover:text-white transition-colors pointer-events-none">
              <span className="w-6 h-6 flex items-center justify-center bg-neon-blue/20 border border-neon-blue/50 group-hover:bg-neon-blue group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>+</span>
              Enter MAC Sequence
            </div>
          ) : (
            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <input
                  value={mac} onChange={(e) => setMac(e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="flex-1 bg-bg-dark border border-neon-blue/40 px-4 py-2 text-sm font-mono text-white outline-none focus:border-neon-blue placeholder:text-text-muted/30 uppercase"
                  style={{ clipPath: polySmall }}
                  onKeyDown={(e) => e.key === "Enter" && handlePair()}
                  autoFocus
                />
                <button
                  onClick={handlePair} disabled={!mac.trim() || loading}
                  className="px-6 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue text-xs font-mono font-bold uppercase tracking-widest transition-all hover:bg-neon-blue hover:text-bg-dark disabled:opacity-40"
                  style={{ clipPath: polySmall }}
                >
                  {loading ? <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin inline-block" /> : "Sync"}
                </button>
              </div>
              <button onClick={() => setOpen(false)} className="text-[10px] font-mono text-text-muted uppercase hover:text-white text-left mt-2">[ Cancel Operation ]</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Creator Panel: invite link + QR + polling ────────────────────────────────
function CreatorInvitePanel({ onJoined }: { onJoined: () => void }) {
  const { getToken } = useAuth();
  const modal = useModal();
  const [inviteURL, setInviteURL] = useState("");
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!inviteURL) return;
    pollRef.current = setInterval(async () => {
      try {
        const t = await getToken();
        if (!t) return;
        const me = await api.getMe(t);
        if (me.couple?.status === "active") {
          clearInterval(pollRef.current!);
          onJoined();
        }
      } catch { /* non-fatal */ }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [inviteURL, getToken, onJoined]);

  async function generate() {
    if (loading || inviteURL) return;
    setLoading(true);
    try {
      const t = await getToken();
      if (!t) throw new Error("Auth failure");
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } catch (err) {
      // ── Invite generation error ────────────────────────────────────────────
      const reason = (err as Error).message ?? "Failed to generate invite";
      modal.open({
        variant: "error",
        seqCode: "INV_GEN_ERR",
        title: "Invite failed",
        body: reason,
        actions: [
          {
            label: "Dismiss",
            variant: "secondary",
            onClick: () => modal.close(),
          },
          {
            label: "Retry →",
            variant: "primary",
            onClick: () => {
              modal.close();
              generate();
            },
          },
        ],
      });
    } finally {
      setLoading(false); 
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // ── Copied success modal ───────────────────────────────────────────────
    modal.open({
      ...ModalPresets.inviteCopied(),
      actions: [
        {
          label: "Got it",
          variant: "primary",
          onClick: () => modal.close(),
        },
      ],
    });
  }

  return (
    <>
      {modal.Modal}

      <div className="relative bg-surface-dark border border-neon-purple/30 p-7" style={{ clipPath: polyClipReverse }}>
        <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(177,34,229,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-neon-purple/10 border border-neon-purple/50 text-neon-purple" style={{ clipPath: polySmall }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">INIT_SEQ: 02</p>
                <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Partner Matrix</h3>
              </div>
            </div>
            <div className={cn("flex items-center gap-2 mt-1 px-2 py-1 bg-surface border", inviteURL ? "border-neon-purple/40" : "border-white/10")} style={{ clipPath: polySmall }}>
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", inviteURL ? "bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" : "bg-neon-pink shadow-[0_0_8px_rgba(255,42,109,0.8)]")} />
              <span className={cn("text-[10px] font-mono uppercase tracking-widest", inviteURL ? "text-neon-purple" : "text-text-muted")}>
                {inviteURL ? "Waiting..." : "Offline"}
              </span>
            </div>
          </div>

          <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
            &gt; Your couple is <span className="text-yellow-400">pending</span>. Generate an invite link and share it with your partner — they click it, sign in, and you&apos;re connected.
          </p>

          {!inviteURL ? (
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-purple hover:text-white transition-colors group"
            >
              <span className="w-6 h-6 flex items-center justify-center bg-neon-purple/20 border border-neon-purple/50 group-hover:bg-neon-purple group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>
                {loading ? <span className="w-3 h-3 border border-bg-dark/40 border-t-bg-dark rounded-full animate-spin" /> : "+"}
              </span>
              Generate Invite Key
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center"><QRCode url={inviteURL} size={160} /></div>
              <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-3 py-2" style={{ clipPath: polySmall }}>
                <a href={inviteURL} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-[10px] font-mono text-neon-purple/80 hover:text-neon-purple truncate underline underline-offset-2 decoration-neon-purple/30"
                  title={inviteURL}>{inviteURL}</a>
                <button onClick={copy}
                  className={cn("px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all shrink-0", copied ? "bg-neon-blue/20 text-neon-blue border border-neon-blue" : "bg-neon-purple/20 text-neon-purple border border-neon-purple hover:bg-neon-purple hover:text-bg-dark")}
                  style={{ clipPath: polySmall }}>{copied ? "Copied ✓" : "Copy"}</button>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-neon-purple/5 border border-neon-purple/20" style={{ clipPath: polySmall }}>
                <span className="w-3 h-3 border border-neon-purple/30 border-t-neon-purple rounded-full animate-spin shrink-0" />
                <p className="text-[10px] font-mono text-neon-purple uppercase tracking-widest">&gt; Listening for partner connection...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Joiner Panel: user B with no couple — paste token ───────────────────────
function JoinerPanel({ onJoined, hasPendingCouple }: { onJoined: () => void; hasPendingCouple?: boolean }) {
  const { joinCouple } = useUser();
  const router = useRouter();
  const [token, setToken]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleJoin() {
    const raw = token.trim();
    if (!raw) return;

    let bareToken = raw;
    try {
      const url = new URL(raw);
      bareToken = url.searchParams.get("token") ?? raw;
    } catch { /* not a URL */ }

    setLoading(true); setError("");
    try {
      await joinCouple(bareToken);
      onJoined();
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message ?? "Failed to join");
    } finally { setLoading(false); }
  }

  return (
    <div className="relative bg-surface-dark border border-neon-purple/30 p-7 hover:border-neon-purple/50 transition-all" style={{ clipPath: polyClipReverse }}>
      <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(177,34,229,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 flex items-center justify-center bg-neon-purple/10 border border-neon-purple/50 text-neon-purple" style={{ clipPath: polySmall }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">INIT_SEQ: 02</p>
            <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Join Partner Matrix</h3>
          </div>
        </div>
        <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
          &gt; Paste the invite link or token sent by your partner below to activate the connection.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={token} onChange={(e) => setToken(e.target.value)}
              placeholder="Paste invite link or token..."
              className="flex-1 bg-bg-dark border border-neon-purple/40 px-4 py-2 text-sm font-mono text-white outline-none focus:border-neon-purple placeholder:text-text-muted/30"
              style={{ clipPath: polySmall }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button onClick={handleJoin} disabled={!token.trim() || loading}
              className="px-6 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple text-xs font-mono font-bold uppercase tracking-widest transition-all hover:bg-neon-purple hover:text-bg-dark disabled:opacity-40 shrink-0"
              style={{ clipPath: polySmall }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin inline-block" /> : "Connect"}
            </button>
          </div>
          {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
          <p className="text-[10px] font-mono text-text-muted/50 uppercase tracking-widest">
            &gt; Or open the invite link your partner shared directly in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Today Prompt ─────────────────────────────────────────────────────────────
function TodayPrompt() {
  return (
    <div className="relative bg-surface border border-neon-pink/40 p-8 shadow-[0_0_40px_rgba(255,42,109,0.1)] overflow-hidden" style={{ clipPath: polyClip }}>
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-60" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6 w-full max-w-sm">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-pink/50" />
          <span className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.3em] animate-pulse">Incoming Transmission</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-pink/50" />
        </div>
        <blockquote className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-snug mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          &quot;If you could relive one moment from the last cycle together, which would it be?&quot;
        </blockquote>
        <span className="px-3 py-1 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-mono text-[10px] uppercase tracking-widest" style={{ clipPath: polySmall }}>#MEMORY_BANK</span>
      </div>
    </div>
  );
}

// ─── Your Answer Card ─────────────────────────────────────────────────────────
function YourAnswerCard() {
  const { sendMessage } = useUser();
  const [text, setText]           = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  async function submit() {
    if (!text.trim()) return;
    setLoading(true); setError("");
    try {
      await sendMessage(text);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message ?? "Transmission failed");
    } finally { setLoading(false); }
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
          <p className="flex items-center gap-2 text-[10px] text-neon-blue uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-neon-blue" />Signal uploaded to terminal</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 font-mono text-neon-blue">&gt;</span>
            <textarea rows={4} placeholder="ENTER_DATA_" value={text} onChange={(e) => setText(e.target.value)}
              className="w-full bg-bg-dark border border-white/10 px-8 py-3 text-sm font-mono text-white resize-none outline-none focus:border-neon-blue placeholder:text-text-muted/30"
              style={{ clipPath: polySmall }} />
          </div>
          {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
          <button onClick={submit} disabled={!text.trim() || loading}
            className="w-full py-3 bg-neon-blue/10 border-2 border-neon-blue text-neon-blue font-mono font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-bg-dark transition-all disabled:opacity-40"
            style={{ clipPath: polySmall }}
          >{loading ? "Transmitting..." : "Send Data //"}</button>
        </div>
      )}
    </div>
  );
}

// ─── Partner Answer Card ──────────────────────────────────────────────────────
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
            {[0, 0.2, 0.4].map((d) => <span key={d} className="w-2 h-2 bg-neon-purple/50 animate-pulse" style={{ animationDelay: `${d}s` }} />)}
          </div>
          <p className="text-xs text-text-muted uppercase tracking-widest">Awaiting Signal...</p>
        </div>
      )}
    </div>
  );
}

// ─── Frame Strip ──────────────────────────────────────────────────────────────
function FrameStrip() {
  const { device } = useUser();
  if (!device) return null;
  const online = device.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
    : false;
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-surface border-l-4" style={{ borderLeftColor: online ? "#05d9e8" : "#ff2a6d" }}>
      <div className="flex items-center gap-4">
        <span className={cn("w-3 h-3 border", online ? "bg-neon-blue/20 border-neon-blue shadow-[0_0_10px_rgba(5,217,232,0.8)]" : "bg-neon-pink/20 border-neon-pink")} />
        <span className="font-mono text-xs uppercase tracking-widest text-white">Hardware Node</span>
        <span className="text-[10px] text-text-muted font-mono hidden sm:block bg-bg-dark px-2 py-0.5 border border-white/5">{device.mac_address}</span>
      </div>
      <span className={cn("text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-widest border", online ? "text-neon-blue border-neon-blue/30 bg-neon-blue/10" : "text-neon-pink border-neon-pink/30 bg-neon-pink/10")}>
        {online ? "Sys_Active" : "Sys_Offline"}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, couple, partnerUser, device, isLoading, error, refetch } = useUser();
  const [justPaired, setJustPaired] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  // Show couple-activated modal when partner joins
  const coupleModal = useModal();
  useEffect(() => {
    if (couple?.status === "active" && prevStatusRef.current && prevStatusRef.current !== "active") {
      const partnerName = partnerUser?.name ?? "REMOTE_NODE";
      setJustPaired(true);
      setTimeout(() => setJustPaired(false), 5000);

      // ── Partner joined modal ─────────────────────────────────────────────
      coupleModal.open({
        ...ModalPresets.coupleActivated(partnerName),
        actions: [
          {
            label: "Enter matrix →",
            variant: "primary",
            onClick: () => coupleModal.close(),
          },
        ],
      });
    }
    prevStatusRef.current = couple?.status ?? null;
  }, [couple?.status, partnerUser?.name]);

  // Poll every 5s while pending
  useEffect(() => {
    if (!couple || couple.status === "active") return;
    const id = setInterval(() => refetch(), 5000);
    return () => clearInterval(id);
  }, [couple?.status, refetch]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "2-digit", day: "2-digit", year: "numeric",
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

  const firstName    = user?.name?.split(" ")[0]?.toUpperCase() ?? "USER";
  const partnerName  = partnerUser?.name?.split(" ")[0]?.toUpperCase() ?? "UNKNOWN_NODE";
  const coupleActive  = couple?.status === "active";
  const couplePending = couple?.status === "pending";
  const noCouple      = !couple;

  const isCreator = couplePending;
  const isJoiner  = noCouple || couplePending;
  const needsPairing = !device;

  return (
    <AppLayout>
      {/* Couple-activated modal */}
      {coupleModal.Modal}

      <div className="min-h-screen bg-bg-dark text-white relative selection:bg-neon-blue/30 selection:text-white pt-12 pb-24">
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

        <div className="max-w-4xl mx-auto px-6 relative z-10">

          {/* Header */}
          <div className="mb-12 border-b border-white/10 pb-8 relative">
            <div className="absolute left-0 bottom-0 w-1/3 h-px bg-gradient-to-r from-neon-blue to-transparent" />
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-blue block" />
              SYSTEM_TIME: {today}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              User_Link: <span className="text-neon-blue italic">[{firstName}]</span>
            </h1>

            {coupleActive && (
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-neon-purple pl-3 py-1 bg-neon-purple/5">
                Matrix synced with <span className="text-neon-purple">{partnerName}</span>.
              </p>
            )}
            {couplePending && (
              <p className="font-mono text-xs uppercase tracking-widest text-yellow-400 mt-4 border-l-2 border-yellow-400/50 pl-3 py-1 bg-yellow-400/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                Couple pending — waiting for partner to connect.
              </p>
            )}
            {noCouple && (
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-white/20 pl-3 py-1">
                No couple linked yet. Pair your device and connect with your partner.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-8">

            {/* Activation flash banner */}
            {justPaired && (
              <div className="flex items-center gap-4 px-5 py-4 bg-neon-purple/10 border border-neon-purple shadow-[0_0_30px_rgba(177,34,229,0.2)]" style={{ clipPath: polySmall }}>
                <span className="w-3 h-3 bg-neon-purple animate-pulse shrink-0" />
                <p className="font-mono text-xs uppercase tracking-widest text-neon-purple">
                  &gt; Link established — partner node connected. Matrix is now active.
                </p>
              </div>
            )}

            {/* ── Setup panels ── */}
            {(needsPairing || isCreator || isJoiner) && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-white/20" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted">Initialization Required</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {needsPairing && <PairFramePanel onPaired={() => refetch()} />}
                  {isCreator    && <CreatorInvitePanel onJoined={() => refetch()} />}
                  {isJoiner     && <JoinerPanel onJoined={() => refetch()} hasPendingCouple={couplePending} />}
                </div>
              </div>
            )}

            {/* ── Active couple content ── */}
            {coupleActive && (
              <div className="flex flex-col gap-8">
                <TodayPrompt />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <YourAnswerCard />
                  <PartnerAnswerCard partnerName={partnerName} />
                </div>
                <FrameStrip />
              </div>
            )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}