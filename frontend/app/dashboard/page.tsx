// "use client";

// import { useState, useEffect, useRef, useCallback } from "react";
// import { useAuth } from "@clerk/nextjs";
// import { AppLayout } from "@/components/layout/AppLayout";
// import { Spinner } from "@/components/ui";
// import { useUser } from "@/providers/UserProvider";
// import { useModal, ModalPresets } from "@/components/ui/info_modal";
// import { api } from "@/api";
// import { cn } from "@/lib/utils";
// import Link from "next/link";
// import { useRouter } from "next/navigation";

// // ─── Clip paths ───────────────────────────────────────────────────────────────
// const polyClip        = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
// const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
// const polySmall       = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

// // ─── QR Code ──────────────────────────────────────────────────────────────────
// function QRCode({ url, size = 160 }: { url: string; size?: number }) {
//   const src = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|1`;
//   return (
//     <div className="flex flex-col items-center gap-2 p-3 bg-white border border-neon-purple/30" style={{ clipPath: polySmall }}>
//       {/* eslint-disable-next-line @next/next/no-img-element */}
//       <img src={src} alt="Invite QR code" width={size} height={size} className="block" style={{ imageRendering: "pixelated" }} />
//       <p className="font-mono text-[8px] text-gray-500 uppercase tracking-widest text-center">Scan to join</p>
//     </div>
//   );
// }

// // ─── Pair Frame Panel ─────────────────────────────────────────────────────────
// function PairFramePanel({ onPaired }: { onPaired: () => void }) {
//   const { pairDevice } = useUser();
//   const modal = useModal();
//   const [mac, setMac]         = useState("");
//   const [loading, setLoading] = useState(false);
//   const [open, setOpen]       = useState(false);

//   async function handlePair() {
//     if (!mac.trim()) return;
//     setLoading(true);
//     try {
//       await pairDevice(mac.trim().toUpperCase());
//       setOpen(false);

//       // ── Success modal ──────────────────────────────────────────────────────
//       modal.open({
//         ...ModalPresets.pairSuccess(mac.trim().toUpperCase()),
//         actions: [
//           {
//             label: "Continue →",
//             variant: "primary",
//             onClick: () => {
//               modal.close();
//               onPaired();
//             },
//           },
//         ],
//       });
//     } catch (err) {
//       const reason = (err as Error).message ?? "Uplink failed";

//       // ── Error modal ────────────────────────────────────────────────────────
//       modal.open({
//         ...ModalPresets.pairError(reason),
//         actions: [
//           {
//             label: "Dismiss",
//             variant: "secondary",
//             onClick: () => modal.close(),
//           },
//           {
//             label: "Retry →",
//             variant: "primary",
//             onClick: () => {
//               modal.close();
//               setOpen(true);
//             },
//           },
//         ],
//       });
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <>
//       {modal.Modal}

//       <div
//         onClick={() => { if (!open) setOpen(true); }}
//         className={`group relative bg-surface-dark border border-neon-blue/30 p-7 transition-all duration-500 hover:border-neon-blue/70 hover:shadow-[0_0_20px_rgba(5,217,232,0.15)] ${!open ? "cursor-pointer" : ""}`}
//         style={{ clipPath: polyClip }}
//       >
//         <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(5,217,232,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
//         <div className="relative z-10">
//           <div className="flex items-start justify-between mb-5">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 flex items-center justify-center bg-neon-blue/10 border border-neon-blue/50 text-neon-blue" style={{ clipPath: polySmall }}>
//                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
//               </div>
//               <div>
//                 <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-blue/70">INIT_SEQ: 01</p>
//                 <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Hardware Link</h3>
//               </div>
//             </div>
//             <div className="flex items-center gap-2 mt-1 px-2 py-1 bg-surface border border-white/10" style={{ clipPath: polySmall }}>
//               <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
//               <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Awaiting</span>
//             </div>
//           </div>
//           <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">&gt; Power up e-ink terminal. Connect to local network. Input displayed MAC sequence below.</p>
//           {!open ? (
//             <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-blue hover:text-white transition-colors pointer-events-none">
//               <span className="w-6 h-6 flex items-center justify-center bg-neon-blue/20 border border-neon-blue/50 group-hover:bg-neon-blue group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>+</span>
//               Enter MAC Sequence
//             </div>
//           ) : (
//             <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
//               <div className="flex gap-2">
//                 <input
//                   value={mac} onChange={(e) => setMac(e.target.value)}
//                   placeholder="AA:BB:CC:DD:EE:FF"
//                   className="flex-1 bg-bg-dark border border-neon-blue/40 px-4 py-2 text-sm font-mono text-white outline-none focus:border-neon-blue placeholder:text-text-muted/30 uppercase"
//                   style={{ clipPath: polySmall }}
//                   onKeyDown={(e) => e.key === "Enter" && handlePair()}
//                   autoFocus
//                 />
//                 <button
//                   onClick={handlePair} disabled={!mac.trim() || loading}
//                   className="px-6 py-2 bg-neon-blue/20 text-neon-blue border border-neon-blue text-xs font-mono font-bold uppercase tracking-widest transition-all hover:bg-neon-blue hover:text-bg-dark disabled:opacity-40"
//                   style={{ clipPath: polySmall }}
//                 >
//                   {loading ? <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin inline-block" /> : "Sync"}
//                 </button>
//               </div>
//               <button onClick={() => setOpen(false)} className="text-[10px] font-mono text-text-muted uppercase hover:text-white text-left mt-2">[ Cancel Operation ]</button>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Creator Panel: invite link + QR + polling ────────────────────────────────
// function CreatorInvitePanel({ onJoined }: { onJoined: () => void }) {
//   const { getToken } = useAuth();
//   const modal = useModal();
//   const [inviteURL, setInviteURL] = useState("");
//   const [loading, setLoading]     = useState(false);
//   const [copied, setCopied]       = useState(false);
//   const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   useEffect(() => {
//     if (!inviteURL) return;
//     pollRef.current = setInterval(async () => {
//       try {
//         const t = await getToken();
//         if (!t) return;
//         const me = await api.getMe(t);
//         if (me.couple?.status === "active") {
//           clearInterval(pollRef.current!);
//           onJoined();
//         }
//       } catch { /* non-fatal */ }
//     }, 4000);
//     return () => { if (pollRef.current) clearInterval(pollRef.current); };
//   }, [inviteURL, getToken, onJoined]);

//   async function generate() {
//     if (loading || inviteURL) return;
//     setLoading(true);
//     try {
//       const t = await getToken();
//       if (!t) throw new Error("Auth failure");
//       const resp = await api.createInvite(t);
//       setInviteURL(resp.invite_url);
//     } catch (err) {
//       // ── Invite generation error ────────────────────────────────────────────
//       const reason = (err as Error).message ?? "Failed to generate invite";
//       modal.open({
//         variant: "error",
//         seqCode: "INV_GEN_ERR",
//         title: "Invite failed",
//         body: reason,
//         actions: [
//           {
//             label: "Dismiss",
//             variant: "secondary",
//             onClick: () => modal.close(),
//           },
//           {
//             label: "Retry →",
//             variant: "primary",
//             onClick: () => {
//               modal.close();
//               generate();
//             },
//           },
//         ],
//       });
//     } finally {
//       setLoading(false); 
//     }
//   }

//   async function copy() {
//     await navigator.clipboard.writeText(inviteURL);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);

//     // ── Copied success modal ───────────────────────────────────────────────
//     modal.open({
//       ...ModalPresets.inviteCopied(),
//       actions: [
//         {
//           label: "Got it",
//           variant: "primary",
//           onClick: () => modal.close(),
//         },
//       ],
//     });
//   }

//   return (
//     <>
//       {modal.Modal}

//       <div className="relative bg-surface-dark border border-neon-purple/30 p-7" style={{ clipPath: polyClipReverse }}>
//         <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(177,34,229,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
//         <div className="relative z-10">
//           <div className="flex items-start justify-between mb-5">
//             <div className="flex items-center gap-3">
//               <div className="w-10 h-10 flex items-center justify-center bg-neon-purple/10 border border-neon-purple/50 text-neon-purple" style={{ clipPath: polySmall }}>
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
//               </div>
//               <div>
//                 <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">INIT_SEQ: 02</p>
//                 <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Partner Matrix</h3>
//               </div>
//             </div>
//             <div className={cn("flex items-center gap-2 mt-1 px-2 py-1 bg-surface border", inviteURL ? "border-neon-purple/40" : "border-white/10")} style={{ clipPath: polySmall }}>
//               <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", inviteURL ? "bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" : "bg-neon-pink shadow-[0_0_8px_rgba(255,42,109,0.8)]")} />
//               <span className={cn("text-[10px] font-mono uppercase tracking-widest", inviteURL ? "text-neon-purple" : "text-text-muted")}>
//                 {inviteURL ? "Waiting..." : "Offline"}
//               </span>
//             </div>
//           </div>

//           <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
//             &gt; Your couple is <span className="text-yellow-400">pending</span>. Generate an invite link and share it with your partner — they click it, sign in, and you&apos;re connected.
//           </p>

//           {!inviteURL ? (
//             <button onClick={generate} disabled={loading}
//               className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest text-neon-purple hover:text-white transition-colors group"
//             >
//               <span className="w-6 h-6 flex items-center justify-center bg-neon-purple/20 border border-neon-purple/50 group-hover:bg-neon-purple group-hover:text-bg-dark transition-all" style={{ clipPath: polySmall }}>
//                 {loading ? <span className="w-3 h-3 border border-bg-dark/40 border-t-bg-dark rounded-full animate-spin" /> : "+"}
//               </span>
//               Generate Invite Key
//             </button>
//           ) : (
//             <div className="flex flex-col gap-4">
//               <div className="flex justify-center"><QRCode url={inviteURL} size={160} /></div>
//               <div className="flex items-center gap-2 bg-bg-dark border border-neon-purple/40 px-3 py-2" style={{ clipPath: polySmall }}>
//                 <a href={inviteURL} target="_blank" rel="noopener noreferrer"
//                   className="flex-1 text-[10px] font-mono text-neon-purple/80 hover:text-neon-purple truncate underline underline-offset-2 decoration-neon-purple/30"
//                   title={inviteURL}>{inviteURL}</a>
//                 <button onClick={copy}
//                   className={cn("px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all shrink-0", copied ? "bg-neon-blue/20 text-neon-blue border border-neon-blue" : "bg-neon-purple/20 text-neon-purple border border-neon-purple hover:bg-neon-purple hover:text-bg-dark")}
//                   style={{ clipPath: polySmall }}>{copied ? "Copied ✓" : "Copy"}</button>
//               </div>
//               <div className="flex items-center gap-3 px-3 py-2 bg-neon-purple/5 border border-neon-purple/20" style={{ clipPath: polySmall }}>
//                 <span className="w-3 h-3 border border-neon-purple/30 border-t-neon-purple rounded-full animate-spin shrink-0" />
//                 <p className="text-[10px] font-mono text-neon-purple uppercase tracking-widest">&gt; Listening for partner connection...</p>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// // ─── Joiner Panel: user B with no couple — paste token ───────────────────────
// function JoinerPanel({ onJoined, hasPendingCouple }: { onJoined: () => void; hasPendingCouple?: boolean }) {
//   const { joinCouple } = useUser();
//   const router = useRouter();
//   const [token, setToken]     = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError]     = useState("");

//   async function handleJoin() {
//     const raw = token.trim();
//     if (!raw) return;

//     let bareToken = raw;
//     try {
//       const url = new URL(raw);
//       bareToken = url.searchParams.get("token") ?? raw;
//     } catch { /* not a URL */ }

//     setLoading(true); setError("");
//     try {
//       await joinCouple(bareToken);
//       onJoined();
//       router.replace("/dashboard");
//     } catch (err) {
//       setError((err as Error).message ?? "Failed to join");
//     } finally { setLoading(false); }
//   }

//   return (
//     <div className="relative bg-surface-dark border border-neon-purple/30 p-7 hover:border-neon-purple/50 transition-all" style={{ clipPath: polyClipReverse }}>
//       <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_25%,rgba(177,34,229,0.03)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
//       <div className="relative z-10">
//         <div className="flex items-center gap-3 mb-5">
//           <div className="w-10 h-10 flex items-center justify-center bg-neon-purple/10 border border-neon-purple/50 text-neon-purple" style={{ clipPath: polySmall }}>
//             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
//           </div>
//           <div>
//             <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-neon-purple/70">INIT_SEQ: 02</p>
//             <h3 className="font-display text-xl uppercase font-bold text-white tracking-wide">Join Partner Matrix</h3>
//           </div>
//         </div>
//         <p className="text-sm font-mono text-text-muted mb-6 leading-relaxed">
//           &gt; Paste the invite link or token sent by your partner below to activate the connection.
//         </p>
//         <div className="flex flex-col gap-3">
//           <div className="flex gap-2">
//             <input
//               value={token} onChange={(e) => setToken(e.target.value)}
//               placeholder="Paste invite link or token..."
//               className="flex-1 bg-bg-dark border border-neon-purple/40 px-4 py-2 text-sm font-mono text-white outline-none focus:border-neon-purple placeholder:text-text-muted/30"
//               style={{ clipPath: polySmall }}
//               onKeyDown={(e) => e.key === "Enter" && handleJoin()}
//             />
//             <button onClick={handleJoin} disabled={!token.trim() || loading}
//               className="px-6 py-2 bg-neon-purple/20 text-neon-purple border border-neon-purple text-xs font-mono font-bold uppercase tracking-widest transition-all hover:bg-neon-purple hover:text-bg-dark disabled:opacity-40 shrink-0"
//               style={{ clipPath: polySmall }}
//             >
//               {loading ? <span className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin inline-block" /> : "Connect"}
//             </button>
//           </div>
//           {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
//           <p className="text-[10px] font-mono text-text-muted/50 uppercase tracking-widest">
//             &gt; Or open the invite link your partner shared directly in this browser.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Today Prompt ─────────────────────────────────────────────────────────────
// function TodayPrompt() {
//   return (
//     <div className="relative bg-surface border border-neon-pink/40 p-8 shadow-[0_0_40px_rgba(255,42,109,0.1)] overflow-hidden" style={{ clipPath: polyClip }}>
//       <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-60" />
//       <div className="relative z-10 flex flex-col items-center text-center">
//         <div className="flex items-center gap-4 mb-6 w-full max-w-sm">
//           <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-pink/50" />
//           <span className="font-mono text-[10px] text-neon-pink uppercase tracking-[0.3em] animate-pulse">Incoming Transmission</span>
//           <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-pink/50" />
//         </div>
//         <blockquote className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-snug mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
//           &quot;If you could relive one moment from the last cycle together, which would it be?&quot;
//         </blockquote>
//         <span className="px-3 py-1 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink font-mono text-[10px] uppercase tracking-widest" style={{ clipPath: polySmall }}>#MEMORY_BANK</span>
//       </div>
//     </div>
//   );
// }

// // ─── Your Answer Card ─────────────────────────────────────────────────────────
// function YourAnswerCard() {
//   const { sendMessage } = useUser();
//   const [text, setText]           = useState("");
//   const [submitted, setSubmitted] = useState(false);
//   const [loading, setLoading]     = useState(false);
//   const [error, setError]         = useState("");

//   async function submit() {
//     if (!text.trim()) return;
//     setLoading(true); setError("");
//     try {
//       await sendMessage(text);
//       setSubmitted(true);
//     } catch (err) {
//       setError((err as Error).message ?? "Transmission failed");
//     } finally { setLoading(false); }
//   }

//   return (
//     <div className="bg-surface-light border-t-2 border-neon-blue p-6 shadow-lg relative" style={{ clipPath: polyClipReverse }}>
//       <div className="flex items-center gap-2 mb-6">
//         <span className="w-2 h-2 bg-neon-blue shadow-[0_0_8px_rgba(5,217,232,0.8)]" />
//         <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-blue">Local Output</h3>
//       </div>
//       {submitted ? (
//         <div className="bg-bg-dark border border-neon-blue/20 p-5 font-mono" style={{ clipPath: polySmall }}>
//           <p className="text-white text-sm mb-4 border-l-2 border-neon-blue pl-3 bg-neon-blue/5 py-2">&gt; {text}</p>
//           <p className="flex items-center gap-2 text-[10px] text-neon-blue uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-neon-blue" />Signal uploaded to terminal</p>
//         </div>
//       ) : (
//         <div className="flex flex-col gap-4">
//           <div className="relative">
//             <span className="absolute left-3 top-3 font-mono text-neon-blue">&gt;</span>
//             <textarea rows={4} placeholder="ENTER_DATA_" value={text} onChange={(e) => setText(e.target.value)}
//               className="w-full bg-bg-dark border border-white/10 px-8 py-3 text-sm font-mono text-white resize-none outline-none focus:border-neon-blue placeholder:text-text-muted/30"
//               style={{ clipPath: polySmall }} />
//           </div>
//           {error && <p className="text-[10px] font-mono text-red-400 uppercase">&gt; ERR: {error}</p>}
//           <button onClick={submit} disabled={!text.trim() || loading}
//             className="w-full py-3 bg-neon-blue/10 border-2 border-neon-blue text-neon-blue font-mono font-bold uppercase tracking-widest hover:bg-neon-blue hover:text-bg-dark transition-all disabled:opacity-40"
//             style={{ clipPath: polySmall }}
//           >{loading ? "Transmitting..." : "Send Data //"}</button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Partner Answer Card ──────────────────────────────────────────────────────
// function PartnerAnswerCard({ partnerName }: { partnerName: string }) {
//   const { content, user } = useUser();
//   const latest = content.find((c) => c.type === "message" && c.sent_to === user?.id);
//   return (
//     <div className="bg-surface-light border-t-2 border-neon-purple p-6 shadow-lg relative" style={{ clipPath: polyClip }}>
//       <div className="flex items-center gap-2 mb-6">
//         <span className="w-2 h-2 bg-neon-purple shadow-[0_0_8px_rgba(177,34,229,0.8)]" />
//         <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-neon-purple">Remote Input: [{partnerName}]</h3>
//       </div>
//       {latest?.message_text ? (
//         <div className="bg-bg-dark border border-neon-purple/20 p-5 font-mono" style={{ clipPath: polySmall }}>
//           <p className="text-white text-sm border-l-2 border-neon-purple pl-3 bg-neon-purple/5 py-2">&gt; {latest.message_text}</p>
//         </div>
//       ) : (
//         <div className="bg-bg-dark border border-dashed border-white/10 p-5 flex items-center gap-4 font-mono" style={{ clipPath: polySmall }}>
//           <div className="flex gap-1 shrink-0">
//             {[0, 0.2, 0.4].map((d) => <span key={d} className="w-2 h-2 bg-neon-purple/50 animate-pulse" style={{ animationDelay: `${d}s` }} />)}
//           </div>
//           <p className="text-xs text-text-muted uppercase tracking-widest">Awaiting Signal...</p>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Frame Strip ──────────────────────────────────────────────────────────────
// function FrameStrip() {
//   const { device } = useUser();
//   if (!device) return null;
//   const online = device.last_seen
//     ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
//     : false;
//   return (
//     <div className="flex items-center justify-between px-6 py-4 bg-surface border-l-4" style={{ borderLeftColor: online ? "#05d9e8" : "#ff2a6d" }}>
//       <div className="flex items-center gap-4">
//         <span className={cn("w-3 h-3 border", online ? "bg-neon-blue/20 border-neon-blue shadow-[0_0_10px_rgba(5,217,232,0.8)]" : "bg-neon-pink/20 border-neon-pink")} />
//         <span className="font-mono text-xs uppercase tracking-widest text-white">Hardware Node</span>
//         <span className="text-[10px] text-text-muted font-mono hidden sm:block bg-bg-dark px-2 py-0.5 border border-white/5">{device.mac_address}</span>
//       </div>
//       <span className={cn("text-[10px] font-mono font-bold px-3 py-1 uppercase tracking-widest border", online ? "text-neon-blue border-neon-blue/30 bg-neon-blue/10" : "text-neon-pink border-neon-pink/30 bg-neon-pink/10")}>
//         {online ? "Sys_Active" : "Sys_Offline"}
//       </span>
//     </div>
//   );
// }

// // ─── Page ─────────────────────────────────────────────────────────────────────
// export default function DashboardPage() {
//   const { user, couple, partnerUser, device, isLoading, error, refetch } = useUser();
//   const [justPaired, setJustPaired] = useState(false);
//   const prevStatusRef = useRef<string | null>(null);

//   // Show couple-activated modal when partner joins
//   const coupleModal = useModal();
//   useEffect(() => {
//     if (couple?.status === "active" && prevStatusRef.current && prevStatusRef.current !== "active") {
//       const partnerName = partnerUser?.name ?? "REMOTE_NODE";
//       setJustPaired(true);
//       setTimeout(() => setJustPaired(false), 5000);

//       // ── Partner joined modal ─────────────────────────────────────────────
//       coupleModal.open({
//         ...ModalPresets.coupleActivated(partnerName),
//         actions: [
//           {
//             label: "Enter matrix →",
//             variant: "primary",
//             onClick: () => coupleModal.close(),
//           },
//         ],
//       });
//     }
//     prevStatusRef.current = couple?.status ?? null;
//   }, [couple?.status, partnerUser?.name]);

//   // Poll every 5s while pending
//   useEffect(() => {
//     if (!couple || couple.status === "active") return;
//     const id = setInterval(() => refetch(), 5000);
//     return () => clearInterval(id);
//   }, [couple?.status, refetch]);

//   const today = new Date().toLocaleDateString("en-US", {
//     weekday: "short", month: "2-digit", day: "2-digit", year: "numeric",
//   }).replace(/,/g, "").replace(/\//g, ".");

//   if (isLoading) {
//     return (
//       <AppLayout>
//         <div className="min-h-[80vh] flex flex-col items-center justify-center bg-bg-dark font-mono text-neon-blue uppercase tracking-widest gap-4">
//           <Spinner />
//           <span>&gt; Accessing Matrix...</span>
//         </div>
//       </AppLayout>
//     );
//   }

//   if (error) {
//     return (
//       <AppLayout>
//         <div className="p-6 bg-red-900/20 border border-red-500 text-red-400 font-mono text-sm uppercase m-8" style={{ clipPath: polySmall }}>
//           &gt; FATAL_ERR: {error}
//         </div>
//       </AppLayout>
//     );
//   }

//   const firstName    = user?.name?.split(" ")[0]?.toUpperCase() ?? "USER";
//   const partnerName  = partnerUser?.name?.split(" ")[0]?.toUpperCase() ?? "UNKNOWN_NODE";
//   const coupleActive  = couple?.status === "active";
//   const couplePending = couple?.status === "pending";
//   const noCouple      = !couple;

//   const isCreator = couplePending;
//   const isJoiner  = noCouple || couplePending;
//   const needsPairing = !device;

//   return (
//     <AppLayout>
//       {/* Couple-activated modal */}
//       {coupleModal.Modal}

//       <div className="min-h-screen bg-bg-dark text-white relative selection:bg-neon-blue/30 selection:text-white pt-12 pb-24">
//         <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

//         <div className="max-w-4xl mx-auto px-6 relative z-10">

//           {/* Header */}
//           <div className="mb-12 border-b border-white/10 pb-8 relative">
//             <div className="absolute left-0 bottom-0 w-1/3 h-px bg-gradient-to-r from-neon-blue to-transparent" />
//             <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted mb-4 flex items-center gap-2">
//               <span className="w-2 h-2 bg-neon-blue block" />
//               SYSTEM_TIME: {today}
//             </p>
//             <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
//               User_Link: <span className="text-neon-blue italic">[{firstName}]</span>
//             </h1>

//             {coupleActive && (
//               <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-neon-purple pl-3 py-1 bg-neon-purple/5">
//                 Matrix synced with <span className="text-neon-purple">{partnerName}</span>.
//               </p>
//             )}
//             {couplePending && (
//               <p className="font-mono text-xs uppercase tracking-widest text-yellow-400 mt-4 border-l-2 border-yellow-400/50 pl-3 py-1 bg-yellow-400/5 flex items-center gap-2">
//                 <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
//                 Couple pending — waiting for partner to connect.
//               </p>
//             )}
//             {noCouple && (
//               <p className="font-mono text-xs uppercase tracking-widest text-text-muted mt-4 border-l-2 border-white/20 pl-3 py-1">
//                 No couple linked yet. Pair your device and connect with your partner.
//               </p>
//             )}
//           </div>

//           <div className="flex flex-col gap-8">

//             {/* Activation flash banner */}
//             {justPaired && (
//               <div className="flex items-center gap-4 px-5 py-4 bg-neon-purple/10 border border-neon-purple shadow-[0_0_30px_rgba(177,34,229,0.2)]" style={{ clipPath: polySmall }}>
//                 <span className="w-3 h-3 bg-neon-purple animate-pulse shrink-0" />
//                 <p className="font-mono text-xs uppercase tracking-widest text-neon-purple">
//                   &gt; Link established — partner node connected. Matrix is now active.
//                 </p>
//               </div>
//             )}

//             {/* ── Setup panels ── */}
//             {(needsPairing || isCreator || isJoiner) && (
//               <div>
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="h-px w-8 bg-white/20" />
//                   <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-text-muted">Initialization Required</span>
//                   <div className="h-px flex-1 bg-white/10" />
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   {needsPairing && <PairFramePanel onPaired={() => refetch()} />}
//                   {isCreator    && <CreatorInvitePanel onJoined={() => refetch()} />}
//                   {isJoiner     && <JoinerPanel onJoined={() => refetch()} hasPendingCouple={couplePending} />}
//                 </div>
//               </div>
//             )}

//             {/* ── Active couple content ── */}
//             {coupleActive && (
//               <div className="flex flex-col gap-8">
//                 <TodayPrompt />
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <YourAnswerCard />
//                   <PartnerAnswerCard partnerName={partnerName} />
//                 </div>
//                 <FrameStrip />
//               </div>
//             )}

//           </div>
//         </div>
//       </div>
//     </AppLayout>
//   );
// }

"use client";

/**
 * /home — the single main screen of p-ink.
 *
 * Layout:
 *   If setup incomplete (no couple OR no device):
 *     → SetupBanner (inline panels for pair device, invite/join partner)
 *
 *   When couple is active:
 *     Left column:
 *       1. Frame preview  — what's on the frame right now
 *       2. Send photo     — PRIMARY ACTION (drag & drop / file pick)
 *       3. Photo queue    — reorder / delete queued items
 *     Right column (sticky):
 *       4. Partner status widget
 *       5. Tamagotchi widget
 *       6. Future feature slots
 *
 * Settings live in the SettingsPanel slide-over (AppLayout).
 * No sidebar. No separate /photos, /device, /settings routes needed.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/AppLayout";
import { Spinner } from "@/components/ui";
import { useUser } from "@/providers/UserProvider";
import { api } from "@/api";
import { useModal, ModalPresets } from "@/components/ui/info_modal";
import { cn } from "@/lib/utils";
import type { Content } from "@/types/api";

// ─── Clip paths ───────────────────────────────────────────────────────────────
const poly        = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySm      = "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
const polyXs      = "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ dot, text }: { dot: string; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: dot, boxShadow: `0 0 5px ${dot}` }} />
      <span className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.3)" }}>
        {text}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP PANELS
// Shown inline at the top of /home until both device is paired + couple active
// ─────────────────────────────────────────────────────────────────────────────

// ── Pair frame ────────────────────────────────────────────────────────────────
function PairFrameSetup({ onPaired }: { onPaired: () => void }) {
  const { pairDevice } = useUser();
  const modal = useModal();
  const [mac, setMac] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handlePair() {
    if (!mac.trim()) return;
    setLoading(true);
    try {
      await pairDevice(mac.trim().toUpperCase());
      modal.open({ ...ModalPresets.pairSuccess(mac.trim().toUpperCase()), actions: [{ label: "Continue →", variant: "primary", onClick: () => { modal.close(); onPaired(); } }] });
    } catch (err) {
      modal.open({ ...ModalPresets.pairError((err as Error).message), actions: [
        { label: "Dismiss", variant: "secondary", onClick: modal.close },
        { label: "Retry →", variant: "primary", onClick: modal.close },
      ] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative p-6 cursor-pointer group transition-all"
        style={{ clipPath: poly, background: "rgba(5,217,232,0.03)", border: "1px solid rgba(5,217,232,0.2)" }}
        onClick={() => !open && setOpen(true)}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, #05d9e8, transparent)" }} />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ clipPath: polyXs, background: "rgba(5,217,232,0.1)", border: "1px solid rgba(5,217,232,0.4)", color: "#05d9e8" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(5,217,232,0.6)" }}>INIT_01</p>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: -0.5 }}>Pair your frame</h3>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1" style={{ clipPath: polyXs, background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.25)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ffc800" }} />
            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "rgba(255,200,0,0.7)" }}>Awaiting</span>
          </div>
        </div>
        <p className="font-mono text-[10px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Power on your e-ink terminal and enter the MAC address shown on its display.
        </p>
        {!open ? (
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(5,217,232,0.6)" }}>
            Click to enter MAC →
          </span>
        ) : (
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <input
              value={mac} onChange={e => setMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handlePair()}
              className="flex-1 font-mono text-sm px-3 py-2 uppercase outline-none"
              style={{ clipPath: polyXs, background: "#07070f", border: "1px solid rgba(5,217,232,0.4)", color: "#fff" }}
            />
            <button
              onClick={handlePair} disabled={!mac.trim() || loading}
              className="px-4 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-40"
              style={{ clipPath: polyXs, border: "1px solid #05d9e8", background: "rgba(5,217,232,0.1)", color: "#05d9e8" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#05d9e8"; (e.currentTarget as HTMLButtonElement).style.color = "#07070f"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(5,217,232,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "#05d9e8"; }}
            >
              {loading ? "..." : "Sync"}
            </button>
            <button onClick={() => setOpen(false)} className="font-mono text-[10px] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>✕</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Invite / join partner ─────────────────────────────────────────────────────
function PartnerSetup({ onLinked }: { onLinked: () => void }) {
  const { getToken } = useAuth();
  const { joinCouple } = useUser();
  const modal = useModal();
  const [mode, setMode] = useState<"choice" | "invite" | "join">("choice");
  const [inviteURL, setInviteURL] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for couple activation once invite is generated
  useEffect(() => {
    if (!inviteURL) return;
    pollRef.current = setInterval(async () => {
      try {
        const t = await getToken();
        if (!t) return;
        const me = await api.getMe(t);
        if (me.couple?.status === "active") {
          clearInterval(pollRef.current!);
          modal.open({
            ...ModalPresets.coupleActivated(me.couple?.user_b_id ?? "Partner"),
            actions: [{ label: "Enter →", variant: "primary", onClick: () => { modal.close(); onLinked(); } }],
          });
        }
      } catch { /* non-fatal */ }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [inviteURL]);

  async function generateInvite() {
    setLoading(true);
    try {
      const t = await getToken();
      if (!t) return;
      const resp = await api.createInvite(t);
      setInviteURL(resp.invite_url);
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!token.trim()) return;
    setLoading(true);
    let bareToken = token.trim();
    try {
      const url = new URL(token.trim());
      bareToken = url.searchParams.get("token") ?? token.trim();
    } catch { /* not a URL */ }
    try {
      await joinCouple(bareToken);
      onLinked();
    } catch (err) {
      modal.open({
        ...ModalPresets.joinError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
          { label: "Retry →", variant: "primary", onClick: modal.close },
        ],
      });
    } finally { setLoading(false); }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {modal.Modal}
      <div
        className="relative p-6 transition-all"
        style={{ clipPath: polyReverse, background: "rgba(177,34,229,0.03)", border: "1px solid rgba(177,34,229,0.2)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #b122e5, transparent)" }} />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 flex items-center justify-center" style={{ clipPath: polyXs, background: "rgba(177,34,229,0.1)", border: "1px solid rgba(177,34,229,0.4)", color: "#b122e5" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "rgba(177,34,229,0.6)" }}>INIT_02</p>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: -0.5 }}>Link partner</h3>
          </div>
        </div>

        {mode === "choice" && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setMode("invite"); generateInvite(); }}
              className="flex-1 py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
              style={{ clipPath: polyXs, border: "1px solid rgba(177,34,229,0.4)", background: "rgba(177,34,229,0.08)", color: "#b122e5" }}
            >
              I invite them
            </button>
            <button onClick={() => setMode("join")}
              className="flex-1 py-2 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
              style={{ clipPath: polyXs, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)" }}
            >
              I have a link
            </button>
          </div>
        )}

        {mode === "invite" && (
          <div className="flex flex-col gap-3 mt-2">
            {loading && !inviteURL && (
              <div className="flex items-center gap-2">
                <Spinner />
                <span className="font-mono text-[10px] uppercase" style={{ color: "rgba(177,34,229,0.6)" }}>Generating...</span>
              </div>
            )}
            {inviteURL && (
              <>
                <div className="flex gap-2">
                  <input readOnly value={inviteURL} className="flex-1 font-mono text-[9px] px-3 py-2 min-w-0 outline-none"
                    style={{ clipPath: polyXs, background: "rgba(177,34,229,0.06)", border: "1px solid rgba(177,34,229,0.3)", color: "rgba(177,34,229,0.8)" }} />
                  <button onClick={copy} className="px-3 font-mono text-[9px] uppercase font-bold tracking-widest shrink-0 transition-all"
                    style={{ clipPath: polyXs, border: "1px solid rgba(177,34,229,0.4)", background: copied ? "rgba(5,217,232,0.15)" : "rgba(177,34,229,0.1)", color: copied ? "#05d9e8" : "#b122e5" }}>
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-2" style={{ clipPath: polyXs, background: "rgba(177,34,229,0.05)", border: "1px solid rgba(177,34,229,0.15)" }}>
                  <span className="w-3 h-3 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: "rgba(177,34,229,0.3)", borderTopColor: "#b122e5" }} />
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(177,34,229,0.5)" }}>Waiting for partner to connect...</span>
                </div>
              </>
            )}
            <button onClick={() => setMode("choice")} className="font-mono text-[9px] uppercase text-left" style={{ color: "rgba(255,255,255,0.2)" }}>← Back</button>
          </div>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste invite link or token..."
                autoFocus onKeyDown={e => e.key === "Enter" && handleJoin()}
                className="flex-1 font-mono text-[10px] px-3 py-2 outline-none"
                style={{ clipPath: polyXs, background: "#07070f", border: "1px solid rgba(177,34,229,0.4)", color: "#fff" }} />
              <button onClick={handleJoin} disabled={!token.trim() || loading}
                className="px-4 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-40"
                style={{ clipPath: polyXs, border: "1px solid #b122e5", background: "rgba(177,34,229,0.1)", color: "#b122e5" }}>
                {loading ? "..." : "Join"}
              </button>
            </div>
            <button onClick={() => setMode("choice")} className="font-mono text-[9px] uppercase text-left" style={{ color: "rgba(255,255,255,0.2)" }}>← Back</button>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FRAME PREVIEW
// ─────────────────────────────────────────────────────────────────────────────
function FramePreview() {
  const { device, partnerUser, frameState } = useUser();
  const online = device?.last_seen
    ? Date.now() - new Date(device.last_seen).getTime() < 10 * 60 * 1000
    : false;

  return (
    <section>
      <SectionLabel dot="#05d9e8" text="Their frame · right now" />
      <div
        className="relative flex gap-5 p-5"
        style={{ clipPath: poly, background: "rgba(5,217,232,0.02)", border: "1px solid rgba(5,217,232,0.12)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, #05d9e8, transparent 60%)", opacity: 0.5 }} />

        {/* E-ink frame mockup */}
        <div
          className="flex-shrink-0 flex items-center justify-center relative"
          style={{
            width: 100, aspectRatio: "3/4",
            clipPath: polySm,
            background: "#0a0a14",
            border: "1.5px solid rgba(5,217,232,0.2)",
            overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(5,217,232,0.03) 5px, rgba(5,217,232,0.03) 6px)",
          }} />
          {frameState?.current_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frameState.current_image_url} alt="Frame content" className="w-full h-full object-cover" style={{ filter: "grayscale(0.4) contrast(1.1)", opacity: 0.85 }} />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-25">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#05d9e8" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span className="font-mono text-[7px] uppercase tracking-widest" style={{ color: "#05d9e8" }}>Empty</span>
            </div>
          )}
          {/* LED */}
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#05d9e8", boxShadow: "0 0 6px #05d9e8" }} />
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-2 min-w-0">
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, textTransform: "uppercase", letterSpacing: -0.5 }}>
            {partnerUser?.name?.split(" ")[0] ?? "Partner"}&apos;s <span style={{ color: "#05d9e8" }}>frame</span>
          </div>
          <div className="flex items-center gap-1.5 w-fit px-2 py-1" style={{ clipPath: polyXs, background: "rgba(5,217,232,0.06)", border: "1px solid rgba(5,217,232,0.2)" }}>
            <span className={cn("w-1.5 h-1.5 rounded-full", online ? "animate-pulse" : "")} style={{ background: online ? "#05d9e8" : "rgba(255,255,255,0.2)", boxShadow: online ? "0 0 6px #05d9e8" : "none" }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: online ? "#05d9e8" : "rgba(255,255,255,0.3)" }}>
              {online ? "Online" : "Offline"}
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {[
              { k: "Last update", v: device?.last_seen ? new Date(device.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—" },
              { k: "On display",  v: frameState?.current_content_type ?? "—" },
            ].map(row => (
              <div key={row.k} className="flex gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider w-24 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{row.k}</span>
                <span className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND PHOTO  (primary action)
// ─────────────────────────────────────────────────────────────────────────────
function SendPhoto() {
  const { uploadContent } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const modal = useModal();
  const [preview, setPreview] = useState<{ src: string; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = e => setPreview({ src: e.target?.result as string, file });
    reader.readAsDataURL(file);
  }

  async function send() {
    if (!preview) return;
    setUploading(true);
    try {
      await uploadContent(preview.file, "photo");
      setPreview(null);
      modal.open({
        ...ModalPresets.transmitSuccess(),
        actions: [{ label: "Done", variant: "primary", onClick: modal.close }],
      });
    } catch (err) {
      modal.open({
        ...ModalPresets.transmitError((err as Error).message),
        actions: [
          { label: "Dismiss", variant: "secondary", onClick: modal.close },
          { label: "Retry →", variant: "primary", onClick: modal.close },
        ],
      });
    } finally { setUploading(false); }
  }

  return (
    <>
      {modal.Modal}
      <section>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, textTransform: "uppercase", letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>
          Send a <span style={{ color: "#ff2a6d" }}>photo.</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          Drops straight to their e-ink frame.
        </p>

        {/* Preview state */}
        {preview ? (
          <div className="flex flex-col gap-3">
            <div className="relative w-full" style={{ aspectRatio: "4/3", clipPath: poly, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.src} alt="Preview" className="w-full h-full object-cover" style={{ filter: "grayscale(0.3) contrast(1.1)" }} />
              <span className="absolute bottom-2 right-2 font-mono text-[8px] uppercase px-2 py-1" style={{ clipPath: polyXs, background: "rgba(5,217,232,0.2)", border: "1px solid rgba(5,217,232,0.4)", color: "#05d9e8" }}>
                Auto-dither active
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={send} disabled={uploading}
                className="flex-1 py-3 font-mono text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50"
                style={{ clipPath: polySm, background: "rgba(255,42,109,0.15)", border: "1.5px solid #ff2a6d", color: "#ff2a6d" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#ff2a6d"; (e.currentTarget as HTMLButtonElement).style.color = "#07070f"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,42,109,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#ff2a6d"; }}
              >
                {uploading ? "Sending..." : "Send to frame //"}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-4 font-mono text-[10px] uppercase tracking-widest transition-all"
                style={{ clipPath: polyXs, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.35)" }}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              className="flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
              style={{ minHeight: 160, border: "2px dashed rgba(255,42,109,0.3)", background: "rgba(255,42,109,0.03)", clipPath: poly, position: "relative", overflow: "hidden" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = "#ff2a6d"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,42,109,0.07)"; }}
              onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,42,109,0.3)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,42,109,0.03)"; }}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,42,109,0.02) 10px, rgba(255,42,109,0.02) 11px)", pointerEvents: "none" }} />
              <div className="flex items-center justify-center" style={{ width: 44, height: 44, clipPath: polyXs, background: "rgba(255,42,109,0.08)", border: "1.5px solid rgba(255,42,109,0.4)", color: "#ff2a6d" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              </div>
              <div className="text-center">
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: -0.5, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
                  Drop photo here
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                  JPG · PNG · WEBP · max 20MB
                </p>
              </div>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full mt-2 py-2.5 font-mono text-[10px] uppercase font-bold tracking-widest transition-all"
              style={{ clipPath: polySm, border: "1px solid rgba(255,42,109,0.25)", background: "rgba(255,42,109,0.05)", color: "rgba(255,42,109,0.7)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ff2a6d"; (e.currentTarget as HTMLButtonElement).style.color = "#ff2a6d"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,42,109,0.25)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,42,109,0.7)"; }}
            >
              Browse local files //
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleFiles(e.target.files)} />
          </>
        )}
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO QUEUE
// ─────────────────────────────────────────────────────────────────────────────
function PhotoQueue() {
  const { content, deleteContent, uploadContent, user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = content.filter(c => c.type === "photo" || c.type === "drawing");

  async function handleDelete(id: string) {
    try { await deleteContent(id); } catch { /* non-fatal */ }
  }

  function statusLabel(c: Content): { label: string; color: string } {
    if (c.status === "displayed") return { label: "On frame", color: "#05d9e8" };
    if (c.status === "queued")    return { label: "Queued",   color: "#b122e5" };
    return                               { label: "Sent",     color: "rgba(255,255,255,0.25)" };
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel dot="rgba(255,255,255,0.3)" text="Photo queue" />
        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-1" style={{ clipPath: polyXs, border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" }}>
          {photos.filter(c => c.status !== "archived").length} queued
        </span>
      </div>

      {photos.length === 0 ? (
        <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.15)" }}>
          No photos yet — drop one above.
        </p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}>
          {photos.map(c => {
            const { label, color } = statusLabel(c);
            const canDelete = c.sent_by === user?.id && c.status === "queued";
            return (
              <div
                key={c.id}
                className="group relative"
                style={{ aspectRatio: "3/4", clipPath: polyXs, overflow: "hidden",
                  background: "#0a0a14",
                  border: c.status === "displayed" ? "1px solid rgba(5,217,232,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: c.status === "displayed" ? "0 0 10px rgba(5,217,232,0.08)" : "none",
                }}
              >
                {c.storage_key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE}/${c.storage_key}`}
                    alt="" className="w-full h-full object-cover"
                    style={{ filter: "grayscale(0.3)" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.1)", fontSize: 10 }}>img</div>
                )}
                <span
                  className="absolute bottom-1 left-1 font-mono text-[7px] uppercase px-1 py-0.5"
                  style={{ clipPath: "polygon(2px 0,100% 0,100% calc(100% - 2px),calc(100% - 2px) 100%,0 100%,0 2px)", background: `${color}22`, color, border: `1px solid ${color}40` }}
                >
                  {label}
                </span>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ clipPath: polyXs, background: "rgba(255,42,109,0.9)", color: "#fff", border: "none" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            );
          })}
          {/* Add new */}
          <button
            onClick={() => fileRef.current?.click()}
            className="transition-all"
            style={{ aspectRatio: "3/4", clipPath: polyXs, background: "transparent", border: "1px dashed rgba(255,42,109,0.2)", color: "rgba(255,255,255,0.15)", fontSize: 18 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ff2a6d"; (e.currentTarget as HTMLButtonElement).style.color = "#ff2a6d"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,42,109,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.15)"; }}
          >
            +
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={async e => {
              if (!e.target.files?.length) return;
              try { await uploadContent(e.target.files[0], "photo"); } catch { /* non-fatal */ }
            }}
          />
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT COLUMN WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

function PartnerWidget() {
  const { partnerUser } = useUser();
  if (!partnerUser) return null;
  return (
    <div className="p-4 relative" style={{ clipPath: poly, background: "rgba(177,34,229,0.03)", border: "1px solid rgba(177,34,229,0.15)" }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #b122e5, transparent)", opacity: 0.5 }} />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0" style={{ clipPath: polyXs, background: "linear-gradient(135deg, rgba(177,34,229,0.5), rgba(255,42,109,0.5))", border: "1px solid rgba(177,34,229,0.4)" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13 }}>
            {(partnerUser.name ?? "P")[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-white">{partnerUser.name?.split(" ")[0]}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#b122e5", boxShadow: "0 0 4px #b122e5" }} />
            <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(177,34,229,0.7)" }}>Online</span>
          </div>
        </div>
      </div>
      {/* Partner frame mini-preview */}
      <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/9", background: "#0a0a14", border: "1px solid rgba(177,34,229,0.1)", clipPath: polyXs }}>
        <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "rgba(177,34,229,0.2)" }}>Partner frame</span>
      </div>
    </div>
  );
}

function TamagotchiWidget() {
  return (
    <div className="p-4 relative cursor-pointer group transition-all" style={{ clipPath: polyReverse, background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.2)" }}>Your companion</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Specter</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center" style={{ clipPath: polyXs, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 20, animation: "float 4s ease-in-out infinite" }}>
          👻
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { label: "Mood",      val: 72, color: "linear-gradient(90deg,#05d9e8,#b122e5)" },
          { label: "Hunger",    val: 38, color: "linear-gradient(90deg,#ff2a6d,#b122e5)" },
          { label: "Happiness", val: 85, color: "linear-gradient(90deg,#b122e5,#ff2a6d)" },
        ].map(s => (
          <div key={s.label}>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>{s.label}</span>
              <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>{s.val}%</span>
            </div>
            <div className="h-1 relative" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="absolute left-0 top-0 h-full" style={{ width: `${s.val}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
      <p className="font-mono text-[8px] uppercase tracking-widest mt-3" style={{ color: "rgba(255,255,255,0.12)", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8 }}>
        ↺ Controlled by partner
      </p>
    </div>
  );
}

function FutureSlot() {
  return (
    <div className="p-4" style={{ border: "1px dashed rgba(255,255,255,0.05)", clipPath: polyReverse }}>
      <p className="font-mono text-[8px] uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(255,255,255,0.1)" }}>Coming soon</p>
      {["Mini games", "Shared playlist", "Mood check-in", "Countdown timer"].map(f => (
        <p key={f} className="font-mono text-[9px] uppercase tracking-widest py-1" style={{ color: "rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          {f}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, couple, device, isLoading, error, refetch } = useUser();

  // Poll while couple is pending
  useEffect(() => {
    if (!couple || couple.status === "active") return;
    const id = setInterval(() => refetch(), 5000);
    return () => clearInterval(id);
  }, [couple?.status, refetch]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
          <Spinner />
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#05d9e8" }}>&gt; Accessing matrix...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6 m-8 font-mono text-sm uppercase" style={{ background: "rgba(255,42,109,0.06)", border: "1px solid rgba(255,42,109,0.3)", color: "#ff2a6d" }}>
          &gt; FATAL: {error}
        </div>
      </AppLayout>
    );
  }

  const coupleActive  = couple?.status === "active";
  const couplePending = couple?.status === "pending";
  const noCouple      = !couple;
  const needsDevice   = !device;
  const setupNeeded   = needsDevice || noCouple || couplePending;

  return (
    <AppLayout>
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* ── Setup banner — shown until fully configured ── */}
        {setupNeeded && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-6" style={{ background: "rgba(255,255,255,0.15)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,200,0,0.6)" }}>
                Setup required
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {needsDevice && <PairFrameSetup onPaired={() => refetch()} />}
              {(noCouple || couplePending) && (
                <PartnerSetup onLinked={() => refetch()} />
              )}
            </div>
          </section>
        )}

        {/* ── Active couple UI ── */}
        {coupleActive && (
          <div className="grid gap-8" style={{ gridTemplateColumns: "1fr 280px" }}>
            {/* Left: main actions */}
            <div className="flex flex-col gap-8">
              <FramePreview />
              <SendPhoto />
              <PhotoQueue />
            </div>

            {/* Right: context widgets (sticky) */}
            <div className="flex flex-col gap-4" style={{ position: "sticky", top: 80, alignSelf: "flex-start" }}>
              <PartnerWidget />
              <TamagotchiWidget />
              <FutureSlot />
            </div>
          </div>
        )}

        {/* ── Pending — no content yet, just wait ── */}
        {couplePending && !needsDevice && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Spinner />
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, textTransform: "uppercase", letterSpacing: -0.5, color: "rgba(255,255,255,0.5)" }}>
              Waiting for partner...
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(177,34,229,0.4)" }}>
              They need to accept the invite link
            </p>
          </div>
        )}

      </div>
    </AppLayout>
  );
}