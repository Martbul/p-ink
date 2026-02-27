"use client";

/**
 * /onboarding — shown exactly once, immediately after first sign-up.
 * Creates the couple record + captures timezone.
 * Once couple exists, /sso-callback/done never sends the user here again.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { Button } from "@/components/ui";

const TIMEZONES = [
  "Europe/Sofia", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, createCouple } = useUser();

  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultTz = TIMEZONES.includes(detected) ? detected : "UTC";

  const [timezone, setTimezone] = useState(defaultTz);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firstName = user?.name?.split(" ")[0] ?? "there";

  async function handleContinue() {
    setLoading(true);
    setError("");
    try {
      await createCouple(timezone);
      // Go straight to dashboard — pair/invite live there, not here
      router.replace("/dashboard");
    } catch (error) {
        const err = error as Error;
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "linear-gradient(160deg, var(--cream) 0%, var(--warm) 100%)" }}
    >
      <Link href="/" className="font-display text-xl font-light text-deep mb-16">
        p<em className="italic text-rose">-ink</em>
      </Link>

      <div className="w-full max-w-lg bg-white rounded-3xl p-10 md:p-14 shadow-xl border border-[rgba(232,197,176,0.3)]">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "var(--warm)", color: "var(--terra)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        <h2 className="font-display text-4xl font-light text-deep mb-3">
          Welcome, <em className="italic text-terra">{firstName}.</em>
        </h2>
        <p className="text-sm text-muted mb-8 leading-relaxed" style={{ fontWeight: 300 }}>
          p-ink keeps you and your partner close through a shared e-ink frame.
          One quick thing before you start — pick your timezone so the frame
          resets at the right midnight.
        </p>

        <div className="mb-8">
          <label className="field-label mb-2 block">Your timezone</label>
          <p className="text-xs text-muted mb-3">
            We detected <strong>{detected}</strong>.
          </p>
          <select
            className="field-select w-full"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
            {error}
          </p>
        )}

        <Button variant="primary" full loading={loading} onClick={handleContinue}>
          Get started →
        </Button>
      </div>
    </div>
  );
}