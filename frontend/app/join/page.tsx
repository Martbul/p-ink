"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@/providers/UserProvider";
import { api, ApiError } from "@/api/api";
import type { InviteInfoResponse } from "@/types/api";
import { Button, Spinner } from "@/components/ui";

function JoinPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const { isSignedIn, isLoaded: clerkLoaded, getToken } = useAuth();
  const { couple, isLoading: userLoading, refetch } = useUser();

  const [info, setInfo] = useState<InviteInfoResponse | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .getInviteInfo(token)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setFetchError((err as ApiError & { status: number }).status === 410
              ? "This invite has already been used or has expired."
              : "Invalid invite link."
            );
          } else {
            setFetchError("Invalid invite link.");
          }
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!clerkLoaded || userLoading) return;
    if (!isSignedIn) return;
    if (!info) return;
    if (joining || hasJoinedRef.current) return;

    if (couple?.status === "active") { router.replace("/dashboard"); return; }
    if (couple && couple.status !== "active") {
      setJoinError("You're already in a pending couple. You cannot join another.");
      return;
    }

    hasJoinedRef.current = true;
    setJoining(true);

    async function doJoin() {
      try {
        const t = await getToken();
        if (!t) throw new Error("Not authenticated");
        await api.joinCouple(t, token);
        await refetch();
        router.replace("/dashboard");
      } catch (err) {
        hasJoinedRef.current = false;
        setJoinError((err as Error).message ?? "Could not join couple");
        setJoining(false);
      }
    }
    doJoin();
  }, [clerkLoaded, userLoading, isSignedIn, info, couple, token, joining, getToken, refetch, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-cream">
        <p className="font-display text-3xl italic text-rose text-center">Missing invite token.</p>
        <Link href="/"><Button variant="ghost">Back to home</Button></Link>
      </div>
    );
  }

  if ((!info && !fetchError) || (isSignedIn && (userLoading || joining))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream">
        <Spinner />
        <p className="font-display text-lg italic text-muted">{joining ? "Connecting you both…" : "Loading…"}</p>
      </div>
    );
  }

  const error = fetchError || joinError;
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 bg-cream">
        <p className="font-display text-3xl italic text-rose text-center">{error}</p>
        <Link href="/dashboard"><Button variant="ghost">Go to dashboard</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "linear-gradient(160deg, var(--cream) 0%, var(--warm) 100%)" }}>
      <Link href="/" className="font-display text-xl font-light text-deep mb-12">
        p<em className="italic text-rose">-ink</em>
      </Link>
      <div className="w-full max-w-md bg-white rounded-3xl p-10 shadow-xl border border-[rgba(232,197,176,0.3)]">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "var(--warm)", color: "var(--terra)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h2 className="font-display text-4xl font-light text-deep mb-3">
          <em className="italic text-terra">{info?.invited_by.name ?? "Someone"}</em>{" "}invited you.
        </h2>
        <p className="text-sm text-muted mb-8 leading-relaxed" style={{ fontWeight: 300 }}>
          Sign in with Google to accept the invite and connect your accounts. The link expires{" "}
          {info ? new Date(info.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "soon"}.
        </p>
        <Link href={`/auth?redirect_url=/join?token=${token}`}>
          <Button variant="primary" full>Sign in to accept →</Button>
        </Link>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream"><Spinner /></div>}>
      <JoinPageInner />
    </Suspense>
  );
}