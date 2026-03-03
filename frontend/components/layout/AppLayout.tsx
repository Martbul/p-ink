"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/UserProvider";

const NAV = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/photos",
    label: "Photos",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
    {
    href: "/device",
    label: "Device",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <line x1="16" y1="3" x2="16" y2="7" />
        <line x1="8" y1="3" x2="8" y2="7" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function TopBar() {
  const {partnerUser} = useUser();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-10 h-16 bg-cream/90 backdrop-blur-md border-b border-warm">
      <Link
        href="/dashboard"
        className="font-display text-xl font-light text-deep"
      >
        p
        <em
          className="italic text-terra not-italic"
          style={{ fontStyle: "italic" }}
        >
          -ink
        </em>
      </Link>
        {partnerUser && (
          <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warm border border-blush text-xs text-mid">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse-dot" />
          {partnerUser.name} is online
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-display"
          style={{
            background: "linear-gradient(135deg, var(--blush), var(--terra))",
          }}
        >
          S
        </div>
      </div>
        )}

      
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-52 shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex flex-col gap-1 p-4 border-r border-warm overflow-y-auto">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150",
              active
                ? "bg-deep text-cream"
                : "text-mid hover:bg-warm hover:text-deep"
            )}
          >
            <span className={active ? "opacity-100" : "opacity-60"}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}

      <div className="flex-1" />

      <Link
        href="/auth/login"
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-muted hover:text-terra transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign out
      </Link>
    </aside>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-10 py-10 max-w-4xl">{children}</main>
      </div>
    </div>
  );
}
