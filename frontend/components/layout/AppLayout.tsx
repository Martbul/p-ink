"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { SettingsPanel } from "../settings/settings_panel";

export const polyClip =
  "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
export const polyClipReverse =
  "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";
export const polySmall =
  "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
export const polyTiny =
  "polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)";

function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { partnerUser } = useUser();

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
      style={{
        background: "rgba(8,6,20,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Link href="/dashboard" className="flex items-baseline gap-0">
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: "#fff",
            letterSpacing: -1,
          }}
        >
          p
        </span>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 16,
            color: "rgba(255,255,255,0.2)",
          }}
        >
          -
        </span>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: -1,
            background: "linear-gradient(135deg, #05d9e8, #b122e5)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ink
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {partnerUser && (
          <div
            className="flex items-center gap-2 px-3 py-1.5"
            style={{
              clipPath: polyTiny,
              border: "1px solid rgba(177,34,229,0.3)",
              background: "rgba(177,34,229,0.06)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#b122e5", boxShadow: "0 0 6px #b122e5" }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(177,34,229,0.8)" }}
            >
              {partnerUser.name?.split(" ")[0]}
            </span>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center transition-all"
          style={{
            width: 36,
            height: 36,
            clipPath: polyTiny,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent",
            color: "rgba(255,255,255,0.35)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "rgba(255,255,255,0.35)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.08)";
          }}
          aria-label="Settings"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#07070f", color: "#fff" }}
    >
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1">{children}</main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
