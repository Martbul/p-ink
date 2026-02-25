import Link from "next/link";
import { StepDots } from "@/components/ui";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step: number;
  totalSteps?: number;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps = 3,
}: OnboardingLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background:
          "linear-gradient(160deg, var(--cream) 0%, var(--warm) 100%)",
      }}
    >
      {/* Brand */}
      <Link
        href="/"
        className="font-display text-xl font-light text-deep mb-12"
      >
        love
        <em
          className="italic"
          style={{ fontStyle: "italic", color: "var(--terra)" }}
        >
          frame
        </em>
      </Link>

      {/* Step dots */}
      <div className="mb-10">
        <StepDots total={totalSteps} current={step} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl p-10 md:p-14 shadow-xl border border-[rgba(232,197,176,0.3)] animate-scale-in">
        {children}
      </div>
    </div>
  );
}
