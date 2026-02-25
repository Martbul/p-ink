"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function HomeNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-14 h-16 transition-all duration-300",
        scrolled
          ? "bg-cream/95 backdrop-blur-md shadow-sm border-b border-warm"
          : "bg-transparent"
      )}
    >
      <Link href="/" className="font-display text-xl font-light text-deep">
        love
        <em
          className="italic"
          style={{ fontStyle: "italic", color: "var(--terra)" }}
        >
          frame
        </em>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <a
          href="#how"
          className="text-sm text-mid hover:text-terra transition-colors tracking-wide"
        >
          How it works
        </a>
        <a
          href="#features"
          className="text-sm text-mid hover:text-terra transition-colors tracking-wide"
        >
          Features
        </a>
        <Link
          href="/auth/login"
          className="text-sm text-mid hover:text-deep transition-colors tracking-wide"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="btn-primary text-sm px-5 py-2 rounded-full"
          style={{
            background: "var(--deep)",
            color: "white",
            padding: "8px 20px",
            borderRadius: "100px",
            fontSize: "13px",
            textDecoration: "none",
            display: "inline-block",
            transition: "background 0.2s",
          }}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
