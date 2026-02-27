Sign up (Clerk)
    ↓
Clerk webhook fires → creates user in our DB
    ↓
SSO callback → redirect to /onboarding/welcome   ← first time only
    ↓
/onboarding/welcome   → POST /api/couples (creates pending couple)
    ↓
/onboarding/pair      → POST /api/devices/pair (links MAC)
    ↓
/onboarding/invite    → POST /api/couples/invite (generates link)
    ↓
/dashboard            ← permanent home from here on

Return visit:
    ↓
Sign in → SSO callback → checks state → /dashboard directly


# LoveFrame — Frontend

> **Next.js web app for managing your LoveFrame.**

The web app is how both partners interact with the system. One person sets up the account and pairs the physical frame; they then invite their partner. From that point, both can send content that appears on the shared display.

---

## What it does

- Lets one user create an account, pair a physical frame, and invite their partner
- Lets both users upload photos, type messages, and send drawings to the frame
- Shows the current and past content queue
- Shows live frame status (online/offline, last seen)
- Handles account and notification settings

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Fonts | Cormorant Garamond (display), Instrument Sans (body) |
| Icons | Inline SVG (no icon library dependency) |

---

## Project structure

```
frontend/
├── app/
│   ├── layout.tsx                 Root layout — fonts, metadata, globals.css
│   ├── page.tsx                   Marketing homepage
│   ├── auth/
│   │   ├── login/page.tsx         Sign in
│   │   └── sign-up/page.tsx       Create account
│   ├── onboarding/
│   │   ├── pair/page.tsx          Step 1 — pair your physical frame
│   │   └── invite/page.tsx        Step 2 — invite your partner
│   ├── dashboard/page.tsx         Main app view
│   ├── photos/page.tsx            Photo/drawing/message queue
│   └── settings/page.tsx          Account, partner, frame, notifications
├── components/
│   ├── ui/
│   │   └── index.tsx              Button, Input, Textarea, Select, Card,
│   │                              Badge, Toggle, Divider, Spinner, StepDots
│   ├── layout/
│   │   ├── AppLayout.tsx          Authenticated shell (nav + sidebar)
│   │   ├── AuthLayout.tsx         Login/sign-up split-screen shell
│   │   └── OnboardingLayout.tsx   Centred onboarding card shell
│   ├── frame/
│   │   └── FrameMiniMockup.tsx    Small e-ink preview used in marketing + auth
│   └── home/
│       ├── HomeNav.tsx            Homepage sticky nav
│       ├── HeroSection.tsx        Hero with floating petals and prompt carousel
│       └── Sections.tsx           How it works, features, CTA, footer
├── lib/
│   └── utils.ts                   cn() helper (clsx + tailwind-merge)
├── styles/
│   └── globals.css                Design tokens (@theme), base styles,
│                                  component classes, keyframes
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## User flow

### First-time setup (person who owns the frame)

```
Homepage → Sign Up → Pair Frame (enter MAC address) → Invite Partner → Dashboard
```

1. **Sign Up** — enter name, email, password. An account and empty couple record is created.
2. **Pair Frame** — enter the MAC address shown in the serial monitor (or displayed on the e-ink screen on first boot). The backend links this MAC to the account.
3. **Invite Partner** — an invite link is generated. Share it with your partner via any channel.
4. **Dashboard** — the app is ready. The frame will show a placeholder until the first content is sent.

### Partner joining

```
Receive invite link → Sign Up (or Log In) → Accept invite → Dashboard
```

The partner visits the invite URL, creates an account (or logs in to an existing one), and the couple record is completed. Both users now share the same content queue and see the same frame status.

### Daily use

Both users open the web app on their phones or computers and:

- Upload a **photo** from their camera roll
- Type a **message** 
- Draw something with the **drawing canvas**

Content is added to the couple's queue. The backend composes it into a BMP at midnight (or immediately for urgent content) and the frame picks it up on its next poll.

---

## Design system

All design tokens are defined as CSS variables inside `@theme {}` in `globals.css`. Tailwind v4 automatically generates utility classes from these.

### Colour palette

| Token | Value | Used for |
|-------|-------|---------|
| `--color-cream` | `#faf7f2` | Page background |
| `--color-warm` | `#f0e8d8` | Subtle backgrounds, hover states |
| `--color-blush` | `#e8c5b0` | Borders, inactive elements |
| `--color-terra` | `#c4714a` | Primary CTA, active states, brand accent |
| `--color-deep` | `#2c1810` | Headlines, dark backgrounds |
| `--color-mid` | `#6b3a28` | Body text on light backgrounds |
| `--color-gold` | `#b8935a` | Partner colour (answers, indicators) |
| `--color-muted` | `#9a7060` | Secondary text, labels |
| `--color-success` | `#5a8a6a` | Online status, success states |
| `--color-error` | `#c4504a` | Validation errors |

### Typography

Cormorant Garamond is used for all large display text, quotes, and emotional moments. Instrument Sans is used for body text, labels, and UI chrome. This pairing creates a contrast between warmth and clarity.

```css
.font-display  →  Cormorant Garamond, serif
.font-body     →  Instrument Sans, sans-serif
```

### Animation classes

All animations are defined in `globals.css` as named keyframes and applied as utility classes:

```css
.animate-fade-up     /* entrance for most content blocks */
.animate-pop-in      /* for modals and success states */
.animate-float       /* for the frame mockup in the hero */
.animate-pulse-dot   /* for the online status indicator */
.animate-spin        /* for loading spinners */

/* Delay modifiers */
.delay-100  .delay-200  .delay-300  .delay-400  .delay-500
```

---

## Pages

### Homepage (`/`)

Marketing page for users who haven't signed up yet. Contains:

- **HomeNav** — sticky nav with scroll-triggered blur, sign in link, and CTA button
- **HeroSection** — large headline, prompt text carousel (6 prompts rotating every 3.6s), floating petal animations, waitlist email form, and a frame mini-mockup showing what the display looks like
- **HowItWorks** — three steps with large display numbers
- **FeaturesSection** — dark background, 4-column feature grid
- **CtaSection** — final call to action
- **HomeFooter**

### Sign Up (`/auth/sign-up`) and Login (`/auth/login`)

Split-screen layout: dark left panel with brand and quote, light right panel with form. Both use `AuthLayout`. Sign-up has client-side validation and flows directly into onboarding. Login flows to the dashboard.

### Pair Frame (`/onboarding/pair`)

The user enters their frame's MAC address. This is a 6-digit code input (matching what shows on the e-ink display on first boot) — alternatively the full MAC address. On submit, `POST /api/frame/pair` is called. This step can be skipped if the frame isn't ready yet.

### Invite Partner (`/onboarding/invite`)

Displays a copyable invite link. The user can also send it by email directly from the form. Explains that the partner only needs the web app — they don't need a second frame.

### Dashboard (`/dashboard`)

The main daily view. Contains:

- **Today's content card** — shows what is currently displayed on the frame (the composed image or a preview)
- **Send content** — tabs for Photo, Message, and Drawing. Upload a file, type a message, or open the drawing canvas. Submitting immediately updates the frame queue.
- **Partner status** — when they last opened the app, whether they've sent something today
- **Frame status** — online/offline badge, last seen timestamp, MAC address

### Photos (`/photos`)

Lists all content in the queue and history. Each item shows status (`queued`, `displayed`, `archived`), who uploaded it (you or partner), and the upload date. Queued items can be deleted. A drag-and-drop upload zone lets you add new photos.

### Settings (`/settings`)

Four sections:

- **Profile** — display name, email, change password
- **Partner** — partner's name and email, connected status, generate new invite link
- **Frame** — timezone (used for midnight rotation), frame MAC address, online status
- **Notifications** — toggle push notifications on/off, toggle daily reminder
- **Account** — sign out, delete account

---

## Getting started

### Prerequisites

- Node.js 20+
- npm or pnpm

### Install and run

```bash
cd frontend/
npm install
npm run dev
```

The app will start at `http://localhost:3000`.

### Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080   # backend URL
NEXT_PUBLIC_VAPID_KEY=...                   # VAPID public key for push notifications
```

### Build for production

```bash
npm run build
npm start
```

---

## State management

The app is intentionally simple — no Redux, no Zustand. State lives in:

- **React `useState`** for component-local UI state (form values, loading, submitted)
- **URL / Next.js router** for navigation state
- **Server state** fetched fresh on each page load (no client-side cache in v1)
- **`localStorage`** for the JWT token only

A future version could add React Query for server state caching once the API is stable.

---

## Authentication

The JWT token returned by `/api/auth/login` and `/api/auth/register` is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every API request. A Next.js middleware file (`middleware.ts`) redirects unauthenticated requests to `/auth/login` for all `/dashboard`, `/photos`, and `/settings` routes.

---

## Drawing canvas

The drawing feature on the dashboard uses the browser's `<canvas>` API. Users can:

- Draw freehand with touch or mouse
- Choose black or white as the drawing colour (matching the e-ink palette)
- Clear and start over
- Submit the canvas as a PNG (the backend dithers it)

The canvas is sized to match the frame's 800×480 aspect ratio so what you draw looks close to what you'll see on the display.

---

## Tailwind v4 notes

This project uses Tailwind CSS v4. The key differences from v3 are:

- `globals.css` starts with `@import "tailwindcss"` — not `@tailwind base/components/utilities`
- All design tokens are in `@theme {}` inside `globals.css` — not in `tailwind.config.ts`
- `@apply` is not used anywhere — component styles are written as plain CSS classes
- `tailwind.config.ts` only contains the `content` array — nothing else

Custom colour names defined in `@theme` (e.g. `--color-terra`) automatically become Tailwind utility classes: `text-terra`, `bg-terra`, `border-terra`, etc.