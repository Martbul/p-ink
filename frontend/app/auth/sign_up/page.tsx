"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    // TODO: call POST /api/auth/register
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // On success: router.push("/onboarding/pair")
  }

  return (
      <div className="animate-fade-up">
        <h1 className="font-display text-5xl font-light text-deep mb-2">
          Create your <em className="italic text-terra">account.</em>
        </h1>
        <p
          className="text-base text-muted mb-10 leading-relaxed"
          style={{ fontWeight: 300 }}
        >
          One of you sets up the account and pairs the frame, then invites their
          partner.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Your name"
            placeholder="Sofia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            autoComplete="name"
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="Min 8 characters"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            full
            loading={loading}
            className="mt-2"
          >
            Create account & set up frame
          </Button>
        </form>

        <p className="text-xs text-muted mt-5 text-center leading-relaxed">
          By creating an account you agree to our{" "}
          <a href="#" className="hover:text-terra underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="hover:text-terra underline">
            Privacy Policy
          </a>
          .
        </p>

        <p className="text-sm text-muted mt-6 text-center">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-terra font-normal hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
  );
}
