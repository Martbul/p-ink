"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api";
import { cn } from "@/lib/utils";

const polyClip = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
function PairFramePanel({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const [mac, setMac] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const[open, setOpen] = useState(false);

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
      onClick={() => {
        if (!open) setOpen(true);
      }}
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
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-blue/70">
                INIT_SEQ: 01
              </p>
              <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">
                Hardware Link
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-surface border border-white/10" style={{ clipPath: polySmall }}>
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
              Awaiting
            </span>
          </div>
        </div>

        <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
          &gt; Power up e-ink terminal. Connect to local network. Input displayed MAC sequence below.
        </p>

        {!open ? (
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-blue hover:text-white transition-colors pointer-events-none">
            <span className="w-6 h-6 flex items-center justify-center bg-neon-blue/20 border border-neon-blue/50 group-hover:bg-neon-blue group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>
              +
            </span>
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
            <button 
              onClick={() => setOpen(false)} 
              className="text-[10px] font-mono text-text-muted uppercase hover:text-white text-left mt-2"
            >
              [ Cancel Operation ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── INIT SEQ: 02 (Invite Partner) ────────────────────────────────────────────
function InvitePartnerPanel() {
  const { getToken } = useAuth();
  const [inviteURL, setInviteURL] = useState("");
  const[loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    // Extra safety check in case the user clicks multiple times
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
      /* 👇 1. THIS MAKES THE ENTIRE BIG DIV CLICKABLE 👇 */
      onClick={() => {
        if (!inviteURL && !loading) generate();
      }}
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
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">
                INIT_SEQ: 02
              </p>
              <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">
                Partner Matrix
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-surface border border-white/10" style={{ clipPath: polySmall }}>
            <span className="w-1.5 h-1.5 bg-neon-pink rounded-full animate-pulse shadow-[0_0_8px_rgba(255,42,109,0.8)]" />
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
              Offline
            </span>
          </div>
        </div>

        <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
          &gt; Generate encrypted invite channel. Partner joins, nodes connect, terminal activates.
        </p>

        {!inviteURL ? (
          /* 👇 2. CHANGED FROM BUTTON TO DIV WITH pointer-events-none 👇 */
          <div
            className={`flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-purple transition-colors pointer-events-none ${loading ? "opacity-40" : "group-hover:text-white"}`}
          >
            <span className="w-6 h-6 flex items-center justify-center bg-neon-purple/20 border border-neon-purple/50 group-hover:bg-neon-purple group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>
              {loading ? <span className="w-3 h-3 border border-bg-dark/40 border-t-bg-dark rounded-full animate-spin" /> : "+"}
            </span>
            Generate Key
          </div>
        ) : (
          /* 👇 3. STOP PROPAGATION SO CLICKING "COPY" DOESN'T BUBBLE TO THE PARENT 👇 */
          <div onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-3 py-2 mb-2" style={{ clipPath: polySmall }}>
              <span className="flex-1 text-[10px] font-mono text-white truncate opacity-80 select-all">
                {inviteURL}
              </span>
              <button
                onClick={copy}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all shrink-0",
                  copied ? "bg-neon-blue/20 text-neon-blue border border-neon-blue" : "bg-neon-purple/20 text-neon-purple border border-neon-purple hover:bg-neon-purple hover:text-bg-dark"
                )}
                style={{ clipPath: polySmall }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            {error && <p className="text-[10px] font-mono text-red-400 uppercase mb-1">&gt; ERR: {error}</p>}
            <p className="text-[10px] font-mono text-text-muted/50 uppercase">[ Key expires in 168 hours ]
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Transmission HUD (Today's Prompt) ────────────────────────────────────────
function TodayPrompt() {
  return (
    <div className="relative bg-surface border border-neon-pink/40 p-8 shadow-[0_0_40px_rgba(255,42,109,0.1)] overflow-hidden" style={{ clipPath: polyClip }}>
      {/* HUD Scanner lines */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-60" />
      <div className="absolute right-0 top-1/2 w-32 h-px bg-gradient-to-l from-neon-pink/50 to-transparent" />
      
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-4 mb-6 w-full max-w-sm">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-pink/50" />
          <span className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.3em] animate-pulse">
            Incoming Transmission
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-pink/50" />
        </div>
        
        <blockquote className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-snug mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          &quot;If you could relive one moment from the last cycle together, which would it be?&quot;
        </blockquote>
        
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-mono text-[10px] uppercase tracking-widest" style={{ clipPath: polySmall }}>
            #MEMORY_BANK
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Output Console (Your Answer) ────────────────────────────────────────────
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
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-blue">
          Local Output
        </h3>
      </div>

      {submitted ? (
        <div className="bg-bg-dark border border-neon-blue/20 p-5 font-mono" style={{ clipPath: polySmall }}>
          <p className="text-white text-sm mb-4 border-l-2 border-neon-blue pl-3 bg-neon-blue/5 py-2">
            &gt; {text}
          </p>
          <p className="flex items-center gap-2 text-[10px] text-neon-blue uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-neon-blue" />
            Signal uploaded to terminal
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

// ─── Input Console (Partner's Answer) ────────────────────────────────────────
function PartnerAnswerCard({ partnerName }: { partnerName: string }) {
  const { content, user } = useUser();
  const latest = content.find(
    (c) => c.type === "message" && c.sent_to === user?.id,
  );

  return (
    <div className="bg-surface-light border-t-2 border-neon-purple p-6 shadow-lg relative" style={{ clipPath: polyClip }}>
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-2 bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" />
        <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-purple">
          Remote Input: [{partnerName}]
        </h3>
      </div>

      {latest?.message_text ? (
        <div className="bg-bg-dark border border-neon-purple/20 p-5 font-mono" style={{ clipPath: polySmall }}>
          <p className="text-white text-sm border-l-2 border-neon-purple pl-3 bg-neon-purple/5 py-2">
            &gt; {latest.message_text}
          </p>
        </div>
      ) : (
        <div className="bg-bg-dark border border-dashed border-white/10 p-5 flex items-center gap-4 font-mono" style={{ clipPath: polySmall }}>
          <div className="flex gap-1 shrink-0">
            {[0, 0.2, 0.4].map((d) => (
              <span
                key={d}
                className="w-2 h-2 bg-neon-purple/50 animate-pulse"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted uppercase tracking-widest">
            Awaiting Signal...
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Hardware Status Strip ────────────────────────────────────────────────────
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
        <span className="text-[10px] text-text-muted font-mono hidden sm:block bg-bg-dark px-2 py-0.5 border border-white/5">
          {device.mac_address}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {device.last_seen && (
          <span className="text-[10px] font-mono text-text-muted hidden sm:block">
            LAST_PING: {new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        )}
        <span className={cn(
          "text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-widest border",
          online ? "text-neon-blue border-neon-blue/30 bg-neon-blue/10" : "text-neon-pink border-neon-pink/30 bg-neon-pink/10"
        )}>
          {online ? "Sys_Active" : "Sys_Offline"}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, couple, partnerUser, device, isLoading, error, refetch } = useUser();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).replace(/,/g, "").replace(/\//g, "."); // format like "SAT 02.28.2026"

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
  const partnerName = partnerUser?.name?.split(" ")[0]?.toUpperCase() ?? "UNKNOWN_NODE";
  const coupleActive = couple?.status === "active";
  const needsPairing = !device;
  const needsInvite = !coupleActive;

  return (
    <AppLayout>
      <div className="min-h-screen bg-bg-dark text-white relative selection:bg-neon-blue/30 selection:text-white pt-12 pb-24">
        {/* Global CRT Scanline Overlay applied within dashboard context */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 animate-fade-in">
          
          {/* Dashboard Header */}
          <div className="mb-12 border-b border-white/10 pb-8 relative">
            <div className="absolute left-0 bottom-0 w-1/3 h-px bg-gradient-to-r from-neon-blue to-transparent" />
            
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-blue block" />
              SYSTEM_TIME: {today}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              User_Link: <span className="text-neon-blue text-glow-blue italic">[{firstName}]</span>
            </h1>
            
            {coupleActive && (
              <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-neon-purple pl-3 py-1 bg-neon-purple/5">
                Matrix synced with <span className="text-neon-purple">{partnerName}</span>.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-8">
            
            {/* Setup panels (If needed) */}
            {(needsPairing || needsInvite) && (
              <div className="animate-fade-up delay-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-white/20" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted">
                    Initialization Required
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {needsPairing && <PairFramePanel onPaired={() => refetch()} />}
                  {needsInvite && <InvitePartnerPanel />}
                </div>
              </div>
            )}

            {/* Active System Content */}
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

            {/* Waiting State Overlay */}
            {!coupleActive && (
              <div className="mt-8 border border-dashed border-white/20 bg-surface/30 p-12 text-center animate-pulse" style={{ clipPath: polyClip }}>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-muted/60">
                  &gt; Waiting for remote node connection... <br/>
                  &gt; Diurnal prompts will initialize post-sync.
                </p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </AppLayout>
  );
}