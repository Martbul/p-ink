"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function AuthPage() {
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in — go straight to the post-auth router
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/sso-callback/done");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleGoogleAuth = async () => {
    if (!isLoaded || isSignedIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",     // Clerk finishes handshake here
        redirectUrlComplete: "/sso-callback/done", // then we route based on DB state
      });
    } catch (err) {
      console.error("OAuth error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 bg-cream font-body selection:bg-rose/20 selection:text-deep">
      {/* LEFT — decorative dark panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-16 overflow-hidden bg-deep">
        <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-rose/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blush/10 blur-[100px] rounded-full pointer-events-none" />

        <Link href="/" className="relative z-10 font-display text-3xl font-light text-cream tracking-wide hover:opacity-80 transition-opacity">
          p<em className="italic text-rose">-ink</em>
        </Link>

        <div className="relative z-10 flex flex-col items-start max-w-lg">
          <div className="absolute -right-20 -top-20 opacity-20 pointer-events-none transform rotate-6 blur-[1px]">
            <FrameMiniMockup size="lg" />
          </div>
          <p className="font-display text-5xl font-light italic leading-snug mb-6 text-cream/95">
            &rdquo;Distance means so little when someone means so much&rdquo;
          </p>
          <p className="text-sm tracking-widest uppercase text-rose/80 font-medium">— Tom McNeal</p>
        </div>

        <p className="relative z-10 text-xs tracking-widest uppercase text-muted/60">
          © {new Date().getFullYear()} p-ink
        </p>
      </div>

      {/* RIGHT — auth form */}
      <div className="flex items-center justify-center px-8 py-16 bg-cream relative overflow-hidden">
        <div className="absolute top-0 right-[-10%] w-[300px] h-[300px] bg-rose/10 blur-[100px] rounded-full pointer-events-none lg:hidden" />

        <div className="w-full max-w-sm animate-fade-up z-10">
          <Link href="/" className="lg:hidden block font-display text-3xl font-light text-deep tracking-wide mb-16">
            p<em className="italic text-rose">-ink</em>
          </Link>

          <h1 className="font-display text-5xl font-light text-deep mb-4">
            Welcome <em className="italic text-rose">home.</em>
          </h1>
          <p className="text-lg text-mid/80 mb-10 leading-relaxed font-light">
            Sign in or create an account to stay close across any distance.
          </p>

          <button
            onClick={handleGoogleAuth}
            disabled={!isLoaded || isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-4 bg-white border border-blush/60 text-deep px-6 py-4 rounded-2xl",
              "hover:border-rose hover:bg-rose/5 hover:shadow-[0_8px_24px_rgba(217,126,139,0.12)] transition-all duration-300 shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed group"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-rose/30 border-t-rose rounded-full animate-spin" />
            ) : (
              <div className="group-hover:scale-105 transition-transform duration-300">
                <GoogleIcon />
              </div>
            )}
            <span className="text-base font-medium">Continue with Google</span>
          </button>

          <p className="text-xs text-muted/80 mt-10 text-center leading-relaxed font-light">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="hover:text-rose transition-colors underline decoration-muted/30 underline-offset-4">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:text-rose transition-colors underline decoration-muted/30 underline-offset-4">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}