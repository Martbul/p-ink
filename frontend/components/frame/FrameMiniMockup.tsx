import { cn } from "@/lib/utils";

interface FrameMiniMockupProps {
  size?: "sm" | "md" | "lg";
  prompt?: string;
  partnerAnswer?: string;
  yourAnswer?: string;
  date?: string;
  className?: string;
}

export function FrameMiniMockup({
  size = "md",
  prompt = "If you could relive one moment from the last year together, which would it be?",
  partnerAnswer = "That evening in Porto when the lights came on…",
  yourAnswer,
  date = "Today · Feb 25",
  className,
}: FrameMiniMockupProps) {
  const widths = { sm: "w-52", md: "w-72", lg: "w-80" };
  const photoH = { sm: "h-14", md: "h-20", lg: "h-24" };
  const titleSz = { sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };
  const promptSz = { sm: "text-[8px]", md: "text-[9px]", lg: "text-[10px]" };
  const answerSz = { sm: "text-[7px]", md: "text-[8px]", lg: "text-[9px]" };

  return (
    <div
      className={cn("animate-float", widths[size], className)}
      style={{ margin: "0 auto" }}
    >
      <div className="frame-mockup rounded-xl overflow-hidden">
        <div className="frame-screen p-3 flex flex-col gap-2">
          {/* Date */}
          <p
            className={cn(
              "tracking-widest uppercase text-[#aaa]",
              titleSz[size]
            )}
            style={{ fontFamily: "var(--font-body)", letterSpacing: "0.1em" }}
          >
            {date}
          </p>

          {/* Photo placeholder */}
          <div
            className={cn(
              "rounded-lg flex items-center justify-center",
              photoH[size]
            )}
            style={{ background: "linear-gradient(135deg,#ede8e0,#ddd4c8)" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c0b0a0"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          {/* Prompt */}
          <p
            className={cn(
              "font-display italic leading-snug text-[#4a3428]",
              promptSz[size]
            )}
          >
            "{prompt}"
          </p>

          {/* Answers */}
          <div className="flex flex-col gap-1">
            <div
              className={cn(
                "flex items-start gap-1.5 text-[#5a4040]",
                answerSz[size]
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                style={{ background: "var(--terra)" }}
              />
              <span>{partnerAnswer}</span>
            </div>
            {yourAnswer ? (
              <div
                className={cn(
                  "flex items-start gap-1.5 text-[#5a4040]",
                  answerSz[size]
                )}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: "var(--gold)" }}
                />
                <span>{yourAnswer}</span>
              </div>
            ) : (
              <div
                className={cn(
                  "flex items-start gap-1.5 opacity-35 text-[#5a4040]",
                  answerSz[size]
                )}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: "var(--gold)" }}
                />
                <span>Waiting for reply…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stand */}
      <div
        className="mx-auto w-10 h-2 rounded-b-md"
        style={{
          background: "#c8bca8",
          boxShadow: "0 4px 12px rgba(44,24,16,0.1)",
        }}
      />
    </div>
  );
}
