"use client";
import { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, Button, Input, Select, Toggle, Badge } from "@/components/ui";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-muted mb-4 pb-3 border-b border-warm">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-[rgba(232,197,176,0.25)] last:border-none">
      <div>
        <p className="text-sm text-deep">{label}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [name, setName] = useState("Sofia");
  const [email, setEmail] = useState("sofia@example.com");
  const [tz, setTz] = useState("Europe/Sofia");
  const [notifs, setNotifs] = useState(true);
  const [reminder, setReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // TODO: PATCH /api/users/me
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function copyInvite() {
    await navigator.clipboard.writeText("https://loveframe.app/join/xk92-mf7p");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TZ_OPTIONS = [
    { value: "Europe/Sofia", label: "Europe/Sofia" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "America/New_York", label: "America/New_York" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo" },
    { value: "Australia/Sydney", label: "Australia/Sydney" },
  ];

  return (
    <AppLayout>
      <div className="page-enter max-w-xl">
        {/* Header */}
        <div className="mb-10">
          <p className="text-eyebrow mb-2">Account</p>
          <h1 className="font-display text-5xl font-light text-deep">
            Your <em className="italic text-terra">settings.</em>
          </h1>
        </div>

        {/* Profile */}
        <Card padding="md" className="mb-5">
          <Section title="Profile">
            <form onSubmit={saveProfile} className="flex flex-col gap-4">
              <Input
                label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="New password"
                type="password"
                placeholder="Leave blank to keep current"
              />
              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={saving}
                >
                  Save changes
                </Button>
                {saved && (
                  <span
                    className="text-xs flex items-center gap-1 animate-fade-in"
                    style={{ color: "var(--success)" }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved
                  </span>
                )}
              </div>
            </form>
          </Section>
        </Card>

        {/* Partner */}
        <Card padding="md" className="mb-5">
          <Section title="Partner">
            <Row label="Alex" sub="alex@example.com · Joined Jan 2, 2025">
              <Badge variant="online">Connected</Badge>
            </Row>

            <div className="mt-4">
              <p className="text-xs text-muted mb-2.5">
                Share a new invite link
              </p>
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ background: "var(--warm)" }}
              >
                <span className="font-display italic text-sm text-deep truncate">
                  loveframe.app/join/xk92-mf7p
                </span>
                <button
                  onClick={copyInvite}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all shrink-0"
                  style={{ borderColor: "var(--blush)", color: "var(--mid)" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </Section>
        </Card>

        {/* Frame */}
        <Card padding="md" className="mb-5">
          <Section title="Frame">
            <Row
              label="Timezone"
              sub="Used to calculate when midnight resets the frame"
            >
              <select
                className="field-select"
                style={{ width: "auto", padding: "8px 32px 8px 12px" }}
                value={tz}
                onChange={(e) => setTz(e.target.value)}
              >
                {TZ_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Row>
            <Row
              label="Frame MAC"
              sub="AA:BB:CC:DD:EE:FF · Last seen 4 min ago"
            >
              <Badge variant="online">Online</Badge>
            </Row>
            <Row label="Firmware" sub="v1.0.0">
              <span className="text-xs text-muted">Up to date</span>
            </Row>
            <div className="pt-3">
              <Button variant="ghost" size="sm">
                Unpair frame
              </Button>
            </div>
          </Section>
        </Card>

        {/* Notifications */}
        <Card padding="md" className="mb-5">
          <Section title="Notifications">
            <Row
              label="Push notifications"
              sub="When your partner submits their answer"
            >
              <Toggle checked={notifs} onChange={() => setNotifs((v) => !v)} />
            </Row>
            <Row
              label="Daily reminder"
              sub="Remind you to answer at 8pm in your timezone"
            >
              <Toggle
                checked={reminder}
                onChange={() => setReminder((v) => !v)}
              />
            </Row>
          </Section>
        </Card>

        {/* Danger zone */}
        <Card padding="md" className="mb-5">
          <Section title="Account">
            <Row
              label="Sign out"
              sub="You'll need to sign back in on this device"
            >
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Sign out
                </Button>
              </Link>
            </Row>
            <Row
              label="Delete account"
              sub="Permanently removes all your data and disconnects the frame"
            >
              <Button variant="danger" size="sm">
                Delete
              </Button>
            </Row>
          </Section>
        </Card>
      </div>
    </AppLayout>
  );
}
