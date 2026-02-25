"use client";
import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input, Divider } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // TODO: call POST /api/auth/login
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // On success: router.push("/dashboard")
    // On fail:
    setError("Invalid email or password. Please try again.");
  }

  return (
    <AuthLayout>
      <div className="animate-fade-up">
        <h1 className="font-display text-5xl font-light text-deep mb-2">
          Welcome <em className="italic text-terra">back.</em>
        </h1>
        <p
          className="text-base text-muted mb-10 leading-relaxed"
          style={{ fontWeight: 300 }}
        >
          Sign in to see today's prompt and check on your partner.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div className="flex flex-col gap-1.5">
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <a
                href="#"
                className="text-xs text-muted hover:text-terra transition-colors"
              >
                Forgot password?
              </a>
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-100">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" full loading={loading}>
            Sign in
          </Button>
        </form>

        <Divider label="or" className="my-7" />

        <Link href="/onboarding/pair">
          <Button variant="ghost" full>
            New here? Set up your frame →
          </Button>
        </Link>

        <p className="text-sm text-muted mt-6 text-center">
          Don't have an account?{" "}
          <Link
            href="/auth/sign-up"
            className="text-terra font-normal hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
