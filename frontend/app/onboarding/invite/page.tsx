"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function InvitePartnerPage() {
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState("");
  const [sending, setSending] = useState(false);

  const inviteLink = "p-ink.app/join/xk92-mf7p";

  async function copyLink() {
    await navigator.clipboard.writeText(`https://${inviteLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerEmail) return;
    setSending(true);
    // TODO: POST /api/couples/invite { email: partnerEmail }
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    setEmailSent(true);
  }

  return (
      {/* Icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "var(--warm)", color: "var(--terra)" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      <h2 className="font-display text-4xl font-light text-deep mb-3">
        Invite your <em className="italic text-terra">partner.</em>
      </h2>
      <p
        className="text-sm text-muted mb-8 leading-relaxed"
        style={{ fontWeight: 300 }}
      >
        Share your invite link or send directly by email. When your partner
        joins through the link, you'll be connected automatically.
      </p>

      {/* Link copy box */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: "var(--warm)" }}
      >
        <p className="text-xs uppercase tracking-widest text-muted mb-2">
          Your invite link
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-base italic text-deep truncate">
            {inviteLink}
          </span>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blush text-xs text-mid hover:border-terra hover:text-terra transition-all shrink-0"
          >
            {copied ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px" style={{ background: "var(--blush)" }} />
        <span className="text-xs text-muted uppercase tracking-widest">
          or send by email
        </span>
        <div className="flex-1 h-px" style={{ background: "var(--blush)" }} />
      </div>

      {/* Email form */}
      {emailSent ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{
            background: "rgba(90,138,106,0.08)",
            border: "1px solid rgba(90,138,106,0.2)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm" style={{ color: "var(--success)" }}>
            Invite sent to <strong>{partnerEmail}</strong>
          </p>
        </div>
      ) : (
        <form onSubmit={sendEmail} className="flex gap-2 mb-6">
          <input
            type="email"
            className="field-input flex-1"
            placeholder="partner@example.com"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
          />
          <Button type="submit" variant="dark" size="sm" loading={sending}>
            Send
          </Button>
        </form>
      )}

      <p className="text-xs text-muted mb-8 leading-relaxed">
        The link expires in 7 days. Your partner only needs the app — they don't
        need a frame to answer.
      </p>

      <div className="flex flex-col gap-3">
        <Link href="/dashboard">
          <Button variant="primary" full>
            Continue to dashboard →
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" full>
            I'll invite them later
          </Button>
        </Link>
      </div>
  );
}
