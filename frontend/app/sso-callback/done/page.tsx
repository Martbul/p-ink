"use client";

/**
 * Post-auth router. Reads DB state and routes:
 *   no couple  →  /onboarding   (first time ever — one screen only)
 *   has couple →  /dashboard    (every subsequent login, forever)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/providers/UserProvider";

export default function SSODonePage() {
  const router = useRouter();
  const { user, couple, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    // Brief window between sign-up and Clerk webhook creating the DB record
    if (!user) {
      const t = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(t);
    }

    if (!couple) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [isLoading, user, couple, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-blush border-t-terra rounded-full animate-spin" />
        <p className="font-display text-lg italic text-muted">Setting things up…</p>
      </div>
    </div>
  );
}