"use client";

/**
 * Clerk redirects here after Google OAuth completes.
 * We finish the auth handshake then route the user based on their DB state:
 *   - new user  (no couple)  → /onboarding/welcome
 *   - has couple, no device  → /onboarding/pair
 *   - fully set up           → /dashboard
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";
import { useUser } from "@/providers/UserProvider";

export default function SSOCallbackPage() {
  return (
    // AuthenticateWithRedirectCallback finishes the Clerk OAuth handshake.
    // Once done, it calls onSuccessfullyRedirected which we intercept below
    // by watching the auth state change in the inner component.
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/sso-callback/done"
      afterSignUpUrl="/sso-callback/done"
    />
  );
}