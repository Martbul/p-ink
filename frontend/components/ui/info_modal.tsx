"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ─── Clip paths ───────────────────────────────────────────────────────────────
const polyClip        = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
const polySmall       = "polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)";

// ─── Variants ─────────────────────────────────────────────────────────────────
export type ModalVariant = "success" | "error" | "warning" | "info" | "loading";

const VARIANT_CONFIG: Record<ModalVariant, {
  color: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  label: string;
  icon: React.ReactNode;
  clipPath: string;
}> = {
  success: {
    color:       "#05d9e8",
    borderColor: "rgba(5,217,232,0.4)",
    bgColor:     "rgba(5,217,232,0.06)",
    glowColor:   "rgba(5,217,232,0.15)",
    label:       "SYS_OK",
    clipPath:    polyClip,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    color:       "#ff2a6d",
    borderColor: "rgba(255,42,109,0.4)",
    bgColor:     "rgba(255,42,109,0.06)",
    glowColor:   "rgba(255,42,109,0.15)",
    label:       "SYS_ERR",
    clipPath:    polyClipReverse,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  warning: {
    color:       "#f5a623",
    borderColor: "rgba(245,166,35,0.4)",
    bgColor:     "rgba(245,166,35,0.06)",
    glowColor:   "rgba(245,166,35,0.15)",
    label:       "SYS_WARN",
    clipPath:    polyClip,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    color:       "#b122e5",
    borderColor: "rgba(177,34,229,0.4)",
    bgColor:     "rgba(177,34,229,0.06)",
    glowColor:   "rgba(177,34,229,0.15)",
    label:       "SYS_INFO",
    clipPath:    polyClipReverse,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  loading: {
    color:       "#05d9e8",
    borderColor: "rgba(5,217,232,0.3)",
    bgColor:     "rgba(5,217,232,0.04)",
    glowColor:   "rgba(5,217,232,0.10)",
    label:       "SYS_PROC",
    clipPath:    polyClip,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    ),
  },
};

// ─── Action button ─────────────────────────────────────────────────────────────
export interface ModalAction {
  label: string;
  /** "primary" = filled accent, "secondary" = ghost, "danger" = red fill */
  variant?: "primary" | "secondary" | "danger";
  onClick: () => void;
  disabled?: boolean;
}

// ─── Modal props ──────────────────────────────────────────────────────────────
export interface InfoModalProps {
  open: boolean;
  onClose?: () => void;

  variant?: ModalVariant;
  /** Short seq code shown above title, e.g. "PAIR_01". Falls back to variant label. */
  seqCode?: string;
  title: string;
  /** Optional body text or JSX. */
  body?: React.ReactNode;
  /** Extra JSX rendered below body (code blocks, inputs, etc.). */
  detail?: React.ReactNode;

  actions?: ModalAction[];
  /** If true, clicking the backdrop closes the modal. Default true. */
  closeOnBackdrop?: boolean;
  /** If true, pressing Escape closes the modal. Default true. */
  closeOnEsc?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InfoModal({
  open,
  onClose,
  variant = "info",
  seqCode,
  title,
  body,
  detail,
  actions = [],
  closeOnBackdrop = true,
  closeOnEsc = true,
}: InfoModalProps) {
  const cfg = VARIANT_CONFIG[variant];

  // Escape key
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape" && onClose) onClose();
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKey);
    // Lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(6,6,12,0.85)", backdropFilter: "blur(6px)" }}
        onClick={closeOnBackdrop && onClose ? onClose : undefined}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md animate-modal-in"
        style={{
          clipPath: cfg.clipPath,
          background: "#0d0d18",
          border: `1px solid ${cfg.borderColor}`,
          boxShadow: `0 0 60px ${cfg.glowColor}, 0 24px 48px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(${cfg.color} 1px, transparent 1px), linear-gradient(90deg, ${cfg.color} 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Accent bar — top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
        />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-6 h-px" style={{ background: cfg.color }} />
          <div className="absolute top-0 left-0 w-px h-6" style={{ background: cfg.color }} />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-6 h-px" style={{ background: cfg.color }} />
          <div className="absolute bottom-0 right-0 w-px h-6" style={{ background: cfg.color }} />
        </div>

        <div className="relative z-10 p-8">

          {/* Header row */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* Icon badge */}
              <div
                className="w-12 h-12 flex items-center justify-center shrink-0"
                style={{
                  clipPath: polySmall,
                  background: cfg.bgColor,
                  border: `1px solid ${cfg.borderColor}`,
                  color: cfg.color,
                }}
              >
                {cfg.icon}
              </div>

              <div>
                <p
                  className="font-mono text-[9px] tracking-[0.3em] uppercase mb-0.5"
                  style={{ color: `${cfg.color}80` }}
                >
                  {seqCode ?? cfg.label}
                </p>
                <h2
                  id="modal-title"
                  className="font-display text-xl font-bold uppercase tracking-wide text-white"
                  style={{ fontFamily: "'Syne', sans-serif", textShadow: `0 0 20px ${cfg.color}30` }}
                >
                  {title}
                </h2>
              </div>
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors shrink-0 mt-0.5"
                style={{ clipPath: polySmall, background: "rgba(255,255,255,0.04)" }}
                aria-label="Close"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: `linear-gradient(90deg, ${cfg.color}30, transparent)` }} />

          {/* Body */}
          {body && (
            <div className="font-mono text-sm leading-relaxed text-white/50 mb-4">
              {typeof body === "string" ? (
                <p><span style={{ color: cfg.color }}>{">"}</span> {body}</p>
              ) : body}
            </div>
          )}

          {/* Detail slot */}
          {detail && (
            <div
              className="mb-6 p-4"
              style={{
                clipPath: polySmall,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid rgba(255,255,255,0.07)`,
              }}
            >
              {detail}
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              {actions.map((action, i) => {
                const isPrimary = action.variant === "primary" || (!action.variant && i === actions.length - 1);
                const isDanger  = action.variant === "danger";
                const accentColor = isDanger ? "#ff2a6d" : cfg.color;

                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="flex-1 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                    style={
                      isPrimary || isDanger
                        ? {
                            clipPath: polySmall,
                            background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}30)`,
                            border: `1px solid ${accentColor}`,
                            color: accentColor,
                          }
                        : {
                            clipPath: polySmall,
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                    onMouseEnter={e => {
                      if (isPrimary || isDanger) {
                        (e.currentTarget as HTMLButtonElement).style.background = accentColor;
                        (e.currentTarget as HTMLButtonElement).style.color = "#080810";
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (isPrimary || isDanger) {
                        (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, ${accentColor}20, ${accentColor}30)`;
                        (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                      } else {
                        (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
                      }
                    }}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .animate-modal-in {
          animation: modal-in 0.25s cubic-bezier(.16,1,.3,1) both;
        }
      `}</style>
    </div>
  );

  // Render into portal so it always sits above everything
  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}

// ─── Hook: useModal ───────────────────────────────────────────────────────────
// Convenience hook to imperatively open/close modals without lifting state.
//
// Usage:
//   const modal = useModal();
//   modal.open({ variant: "success", title: "Frame paired!", body: "..." });
//   modal.close();

import { useState } from "react";

type ModalConfig = Omit<InfoModalProps, "open" | "onClose">;

export function useModal() {
  const [state, setState] = useState<{ open: boolean; config: ModalConfig }>({
    open: false,
    config: { title: "" },
  });

  const open  = useCallback((config: ModalConfig) => setState({ open: true, config }), []);
  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  const Modal = (
    <InfoModal
      {...state.config}
      open={state.open}
      onClose={() => {
        close();
        state.config.onClose?.();
      }}
    />
  );

  return { open, close, Modal };
}

// ─── Preset factories ─────────────────────────────────────────────────────────
// Ready-made configs for every known dashboard event.
// Usage: modal.open(ModalPresets.pairSuccess("AA:BB:CC:DD:EE:FF"))

export const ModalPresets = {

  // ── Hardware pairing ──────────────────────────────────────────────────────

  pairSuccess: (mac: string): ModalConfig => ({
    variant: "success",
    seqCode: "PAIR_OK",
    title: "Frame linked",
    body: "E-ink terminal is now synced to your account. You're live.",
    detail: (
      <p className="font-mono text-xs text-white/40 uppercase tracking-widest">
        Node: <span className="text-white/70">{mac}</span>
      </p>
    ),
    actions: [{ label: "Continue →", variant: "primary", onClick: () => {} }],
  }),

  pairError: (reason: string): ModalConfig => ({
    variant: "error",
    seqCode: "PAIR_ERR",
    title: "Uplink failed",
    body: reason,
    detail: (
      <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest leading-relaxed">
        Check the MAC address on the back of your frame and try again.
        Make sure the device is powered on and connected to Wi-Fi.
      </p>
    ),
    actions: [
      { label: "Dismiss",   variant: "secondary", onClick: () => {} },
      { label: "Retry →",   variant: "primary",   onClick: () => {} },
    ],
  }),

  // ── Couple / partner ──────────────────────────────────────────────────────

  coupleActivated: (partnerName: string): ModalConfig => ({
    variant: "success",
    seqCode: "COUPLE_LIVE",
    title: "Connection established",
    body: `Partner node [${partnerName.toUpperCase()}] has joined. Your matrix is now active.`,
    actions: [{ label: "Enter matrix →", variant: "primary", onClick: () => {} }],
  }),

  joinError: (reason: string): ModalConfig => ({
    variant: "error",
    seqCode: "JOIN_ERR",
    title: "Join failed",
    body: reason,
    actions: [
      { label: "Dismiss",  variant: "secondary", onClick: () => {} },
      { label: "Try again", variant: "primary",  onClick: () => {} },
    ],
  }),

  inviteCopied: (): ModalConfig => ({
    variant: "success",
    seqCode: "INV_COPY",
    title: "Link copied",
    body: "Invite URL is in your clipboard. Share it with your partner.",
    actions: [{ label: "Got it", variant: "primary", onClick: () => {} }],
  }),

  inviteExpired: (): ModalConfig => ({
    variant: "warning",
    seqCode: "INV_EXP",
    title: "Invite expired",
    body: "This invite link is no longer valid. Generate a new one from your dashboard.",
    actions: [
      { label: "Dismiss",     variant: "secondary", onClick: () => {} },
      { label: "Regenerate →", variant: "primary",  onClick: () => {} },
    ],
  }),

  // ── Prompt / content ──────────────────────────────────────────────────────

  transmitSuccess: (): ModalConfig => ({
    variant: "success",
    seqCode: "TX_OK",
    title: "Signal transmitted",
    body: "Your answer has been sent to your partner's frame.",
    actions: [{ label: "Done", variant: "primary", onClick: () => {} }],
  }),

  transmitError: (reason: string): ModalConfig => ({
    variant: "error",
    seqCode: "TX_ERR",
    title: "Transmission failed",
    body: reason,
    actions: [
      { label: "Dismiss",  variant: "secondary", onClick: () => {} },
      { label: "Resend →", variant: "primary",   onClick: () => {} },
    ],
  }),

  // ── Device status ─────────────────────────────────────────────────────────

  deviceOffline: (lastSeen: string): ModalConfig => ({
    variant: "warning",
    seqCode: "NODE_OFFLINE",
    title: "Frame offline",
    body: `No heartbeat received from your e-ink terminal.`,
    detail: (
      <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
        Last seen: <span className="text-white/50">{lastSeen}</span>
      </p>
    ),
    actions: [{ label: "Dismiss", variant: "secondary", onClick: () => {} }],
  }),

  // ── Generic / destructive ─────────────────────────────────────────────────

  confirmLeave: (onConfirm: () => void): ModalConfig => ({
    variant: "warning",
    seqCode: "COUPLE_LEAVE",
    title: "Leave couple?",
    body: "This will dissolve your connection. Your partner will be notified. This cannot be undone.",
    actions: [
      { label: "Cancel",      variant: "secondary", onClick: () => {} },
      { label: "Leave →",     variant: "danger",    onClick: onConfirm },
    ],
  }),

  processing: (message = "Processing..."): ModalConfig => ({
    variant: "loading",
    seqCode: "SYS_PROC",
    title: message,
    closeOnBackdrop: false,
    closeOnEsc: false,
  } as ModalConfig),

};