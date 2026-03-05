"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { FrameMiniMockup } from "@/components/frame/FrameMiniMockup";

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#05d9e8" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#b122e5" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#ff2a6d" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#e0e6ed" />
  </svg>
);

const polyClip = "polygon(20px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 20px)";
const polyClipReverse = "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))";

export default function AuthPage() {
  const { signIn, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/sso-callback/done");
    }
  },[isLoaded, isSignedIn, router]);

  const handleGoogleAuth = async () => {
    if (!isLoaded || isSignedIn) return;
    setIsLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/sso-callback/done",
      });
    } catch (err) {
      console.error("OAuth error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 bg-bg-dark font-body selection:bg-neon-pink/30 selection:text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 mix-blend-overlay" />

      <div className="relative hidden lg:flex flex-col justify-between p-16 overflow-hidden bg-surface-dark border-r border-white/5">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-neon-pink/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-neon-blue/10 blur-[100px] rounded-full pointer-events-none" />

        <Link href="/" className="relative z-10 font-display text-3xl font-black tracking-widest text-white uppercase flex items-center gap-2 group w-fit">
          <span className="text-neon-pink group-hover:text-glow-pink transition-all">P-INK</span>
          <span className="text-[10px] font-mono text-neon-blue border border-neon-blue/40 px-1 py-0.5 rounded-sm">SYS_AUTH</span>
        </Link>

        <div className="relative z-10 flex flex-col items-start max-w-lg">
          <div className="absolute -right-20 -top-20 opacity-30 pointer-events-none transform rotate-12 blur-[1px] border border-neon-blue/50 p-2 shadow-[0_0_30px_rgba(5,217,232,0.3)] bg-surface/50" style={{ clipPath: polyClip }}>
            <FrameMiniMockup size="lg" />
          </div>
          <p className="font-mono text-xs text-neon-blue tracking-[0.3em] uppercase mb-4 animate-pulse">
            &gt; Secure Connection Required
          </p>
          <p className="font-display text-5xl font-black uppercase tracking-tighter leading-snug mb-6 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Distance is an <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-neon-purple text-glow-pink italic">Illusion.</span>
          </p>
          <div className="flex gap-2 text-xs font-mono text-text-muted">
            <span className="text-neon-pink">sys.log:</span> Connection matrix online.
          </div>
        </div>

        <p className="relative z-10 text-[10px] font-mono tracking-widest uppercase text-text-muted/40">
          OS_VERSION: {new Date().getFullYear()}.1 // P-INK NETWORK
        </p>
      </div>

      {/* RIGHT — Terminal Auth form */}
      <div className="flex items-center justify-center px-8 py-16 relative overflow-hidden z-10">
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-neon-purple/10 blur-[120px] rounded-full pointer-events-none lg:hidden" />

        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="lg:hidden block font-display text-3xl font-black tracking-widest text-white uppercase mb-16">
            <span className="text-neon-pink">P-INK</span>
          </Link>

          <div className="bg-surface/80 border border-white/10 p-10 backdrop-blur-md relative" style={{ clipPath: polyClip }}>
            {/* Inner scanline decoration */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-neon-pink to-transparent opacity-50" />
            
            <p className="text-neon-pink font-mono text-xs tracking-[0.3em] uppercase mb-2">
              Authentication
            </p>
            <h1 className="font-display text-4xl font-black text-white uppercase tracking-tight mb-4">
              System <span className="text-neon-blue text-glow-blue italic">Login</span>
            </h1>
            <p className="text-sm text-text-muted mb-10 font-mono">
              &gt; Initialize session to access localized network.
            </p>

            <button
              onClick={handleGoogleAuth}
              disabled={!isLoaded || isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-4 bg-surface-light border border-neon-blue/50 text-white px-6 py-4 transition-all duration-300 relative group overflow-hidden",
                "disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neon-blue/10 hover:border-neon-blue hover:shadow-[0_0_20px_rgba(5,217,232,0.3)]"
              )}
              style={{ clipPath: "polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)" }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin" />
              ) : (
                <div className="group-hover:scale-110 transition-transform duration-300">
                  <GoogleIcon />
                </div>
              )}
              <span className="text-sm font-mono font-bold tracking-widest uppercase">
                {isLoading ? "Authenticating..." : "Uplink via Google"}
              </span>
            </button>

            <div className="mt-8 border-t border-white/5 pt-6">
              <p className="text-[10px] font-mono text-text-muted/60 text-center uppercase tracking-widest">
                By connecting, you accept the{" "}
                <Link href="/terms" className="text-neon-pink hover:text-glow-pink transition-all">Terms</Link>{" "}
                &{" "}
                <Link href="/privacy" className="text-neon-blue hover:text-glow-blue transition-all">Privacy Data</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}