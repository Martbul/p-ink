"use client";
import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// ─── BUTTON ──────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "ghost" | "dark" | "danger";
type BtnSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  full?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = "btn";
  const variants: Record<BtnVariant, string> = {
    primary: "btn-primary",
    ghost: "btn-ghost",
    dark: "btn-dark",
    danger:
      "btn bg-transparent text-rose border-[1.5px] border-rose hover:bg-rose hover:text-white px-7 py-3",
  };
  const sizes: Record<BtnSize, string> = {
    sm: "btn-sm",
    md: "",
    lg: "btn-lg",
  };

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        full && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "field-input",
            error &&
              "border-[var(--error)] focus:shadow-[0_0_0_3px_rgba(196,80,74,0.10)]",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn("field-textarea", className)}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ─── SELECT ──────────────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <select id={inputId} className={cn("field-select", className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
}: CardProps) {
  const paddings = { none: "", sm: "p-4", md: "p-6 md:p-8", lg: "p-8 md:p-10" };
  return (
    <div
      className={cn(
        hover ? "card-hover" : "card",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
type BadgeVariant = "online" | "offline" | "terra" | "gold" | "success";

export function Badge({
  variant = "terra",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge-${variant}`, className)}>
      {variant === "online" && (
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse-dot" />
      )}
      {children}
    </span>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      className={cn("toggle-track", checked && "on")}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
    >
      <div className="toggle-thumb" />
    </div>
  );
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export function Divider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (!label) return <div className={cn("divider-fade my-6", className)} />;
  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="flex-1 divider-fade" />
      <span className="text-xs text-muted tracking-widest uppercase">
        {label}
      </span>
      <div className="flex-1 divider-fade" />
    </div>
  );
}

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "w-5 h-5 border-2 border-blush border-t-terra rounded-full animate-spin inline-block",
        className
      )}
    />
  );
}

// ─── STEP DOTS ────────────────────────────────────────────────────────────────
export function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "step-dot",
            i === current && "step-dot-active",
            i < current && "step-dot-done"
          )}
        />
      ))}
    </div>
  );
}
