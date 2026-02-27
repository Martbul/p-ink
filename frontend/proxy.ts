import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Route protection rules:
 *
 * Public  — anyone can visit (marketing, auth)
 * Private — must be signed in (dashboard, onboarding, settings, photos)
 *
 * NOTE: we do NOT redirect between onboarding steps here — that logic
 * lives in /sso-callback/done and reads actual DB state. Middleware only
 * knows about auth state (signed in / not), not DB state.
 */

const isPublicRoute = createRouteMatcher([
  "/",
  "/auth(.*)",
  "/sso-callback(.*)",
  "/join(.*)",   // partner invite accept — must work before sign-in
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  // Await the auth() promise to get the session data
  const authObject = await auth();

  // Not signed in → bounce to /auth
  if (!authObject.userId) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher:[
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};