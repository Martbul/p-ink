"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Button } from "@/components/ui";

export default function PairFramePage() {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const filled = digits.every((d) => d !== "");
  const code = digits.join("");

  function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs[i + 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...digits];
    pasted.split("").forEach((d, i) => {
      next[i] = d;
    });
    setDigits(next);
    refs[Math.min(pasted.length, 5)].current?.focus();
  }

  async function handleSubmit() {
    if (!filled) return;
    setLoading(true);
    setError("");
    // TODO: POST /api/devices/pair { pairing_code: code }
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // On success: router.push("/onboarding/invite")
    // Simulate failure for demo:
    // setError("Code not found. Make sure the frame is powered on and connected to WiFi.");
    window.location.href = "/onboarding/invite";
  }

  return (
    <OnboardingLayout step={0}>
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
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>

      <h2 className="font-display text-4xl font-light text-deep mb-3">
        Pair your <em className="italic text-terra">frame.</em>
      </h2>
      <p
        className="text-sm text-muted mb-8 leading-relaxed"
        style={{ fontWeight: 300 }}
      >
        Power on the e-ink frame and connect it to WiFi using the setup steps
        on-screen. A 6-digit code will appear on the display — enter it below.
      </p>

      {/* 6-digit input */}
      <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            className="code-digit"
            maxLength={1}
            inputMode="numeric"
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-center px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-100 mb-4">
          {error}
        </p>
      )}

      <p className="text-xs text-center text-muted mb-8">
        Frame not showing a code?{" "}
        <a href="#" className="text-terra hover:underline">
          Troubleshooting guide →
        </a>
      </p>

      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          full
          disabled={!filled}
          loading={loading}
          onClick={handleSubmit}
        >
          Pair frame →
        </Button>
        <Link href="/onboarding/invite">
          <Button variant="ghost" full>
            Skip for now
          </Button>
        </Link>
      </div>
    </OnboardingLayout>
  );
}
