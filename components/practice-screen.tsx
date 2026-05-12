"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { ShortcutRail } from "@/components/shortcut-rail";
import { formatCurrencyAmount, formatPercent } from "@/lib/formatting";
import { applyFormulaToAmount } from "@/lib/formulas/apply-formula";
import type {
  FormulaCandidate,
  ShortcutRecommendation,
} from "@/lib/types";

type PracticeScreenProps = {
  recommendation: ShortcutRecommendation;
  best: FormulaCandidate;
};

type SprintResult = {
  amount: number;
  answer: number;
  shortcutEstimate: number;
  exact: number;
  exactRelativeMiss: number;
  shortcutRelativeMiss: number;
  grade: "right" | "close" | "off";
};

type FlameAnchor = {
  axis: "x" | "y";
  offset: string;
  side: "top" | "right" | "bottom" | "left";
};

const SECTION_FLAME_ANCHORS: FlameAnchor[] = [
  { axis: "x", offset: "9%", side: "top" },
  { axis: "x", offset: "23%", side: "top" },
  { axis: "x", offset: "38%", side: "top" },
  { axis: "x", offset: "54%", side: "top" },
  { axis: "x", offset: "69%", side: "top" },
  { axis: "x", offset: "84%", side: "top" },
  { axis: "y", offset: "17%", side: "right" },
  { axis: "y", offset: "34%", side: "right" },
  { axis: "y", offset: "51%", side: "right" },
  { axis: "y", offset: "69%", side: "right" },
  { axis: "y", offset: "84%", side: "right" },
  { axis: "x", offset: "82%", side: "bottom" },
  { axis: "x", offset: "66%", side: "bottom" },
  { axis: "x", offset: "49%", side: "bottom" },
  { axis: "x", offset: "33%", side: "bottom" },
  { axis: "x", offset: "16%", side: "bottom" },
  { axis: "y", offset: "78%", side: "left" },
  { axis: "y", offset: "60%", side: "left" },
  { axis: "y", offset: "43%", side: "left" },
  { axis: "y", offset: "26%", side: "left" },
];

const STREAK_BOX_FLAME_ANCHORS: FlameAnchor[] = [
  { axis: "x", offset: "18%", side: "top" },
  { axis: "x", offset: "50%", side: "top" },
  { axis: "x", offset: "82%", side: "top" },
  { axis: "y", offset: "50%", side: "left" },
  { axis: "y", offset: "50%", side: "right" },
  { axis: "x", offset: "28%", side: "bottom" },
  { axis: "x", offset: "72%", side: "bottom" },
];

const SPRINT_DURATION_SECONDS = 60;
const EXACT_CLOSE_ENOUGH_THRESHOLD = 0.1;

function roundSprintAmount(amount: number) {
  if (amount >= 1000) {
    return Math.max(100, Math.round(amount / 50) * 50);
  }

  if (amount >= 100) {
    return Math.max(10, Math.round(amount / 10) * 10);
  }

  if (amount >= 20) {
    return Math.max(5, Math.round(amount / 5) * 5);
  }

  if (amount >= 5) {
    return Math.max(1, Math.round(amount));
  }

  return Math.max(0.5, Math.round(amount * 2) / 2);
}

function buildSprintAmount(testAmounts: number[], lastAmount: number | null) {
  const usableAmounts = testAmounts.slice(0, 6);
  const baseAmount =
    usableAmounts[Math.floor(Math.random() * usableAmounts.length)] ?? 10;
  const factorOptions = [0.8, 0.9, 1, 1.1, 1.2, 1.5];
  let nextAmount = baseAmount;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const factor =
      factorOptions[Math.floor(Math.random() * factorOptions.length)] ?? 1;
    nextAmount = roundSprintAmount(baseAmount * factor);

    if (nextAmount !== lastAmount) {
      break;
    }
  }

  return nextAmount;
}

function hasSameDisplayedShortcutAnswer(
  answer: number,
  shortcutEstimate: number,
  currency: ShortcutRecommendation["quote"]["quoteCurrency"],
) {
  return (
    formatCurrencyAmount(answer, currency) ===
    formatCurrencyAmount(shortcutEstimate, currency)
  );
}

function getResultTone(grade: SprintResult["grade"]) {
  if (grade === "right") {
    return {
      label: "Yes! You're right",
      className: "bg-[#e3f5ea] text-[#1f6a42]",
      sectionClassName: "border-[#6fcb93] ring-2 ring-[#8bdaad] shadow-[0_0_0_1px_rgba(111,203,147,0.18)]",
      overlayClassName: "bg-[#dff6e6]/80",
    };
  }

  if (grade === "close") {
    return {
      label: "Yes, close enough",
      className: "bg-[#e8f6eb] text-[#2b6b43]",
      sectionClassName: "border-[#86d4a2] ring-2 ring-[#b9e5c7] shadow-[0_0_0_1px_rgba(134,212,162,0.16)]",
      overlayClassName: "bg-[#e6f8ea]/82",
    };
  }

  return {
    label: "Oops, a bit off",
    className: "bg-[#fff2f2] text-[#8c2d2d]",
    sectionClassName: "border-[#ef9d9d] ring-2 ring-[#f4b5b5] shadow-[0_0_0_1px_rgba(239,157,157,0.16)]",
    overlayClassName: "bg-[#ffe1e1]/82",
  };
}

function getBestStreak(results: SprintResult[]) {
  let bestStreak = 0;
  let currentStreak = 0;

  for (const result of results) {
    if (result.grade === "right") {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return bestStreak;
}

function getCurrentStreak(results: SprintResult[]) {
  let currentStreak = 0;

  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index]?.grade === "right") {
      currentStreak += 1;
      continue;
    }

    break;
  }

  return currentStreak;
}

function getStreakVisuals(streak: number) {
  if (streak >= 10) {
    return { tint: 0.22, glow: 0.32, fire: 1, shake: 1.6 };
  }

  if (streak >= 7) {
    return { tint: 0.18, glow: 0.26, fire: 0.8, shake: 1.2 };
  }

  if (streak >= 5) {
    return { tint: 0.14, glow: 0.22, fire: 0.62, shake: 0.95 };
  }

  if (streak >= 3) {
    return { tint: 0.11, glow: 0.18, fire: 0.42, shake: 0.65 };
  }

  if (streak >= 1) {
    return { tint: 0.08, glow: 0.14, fire: 0.2, shake: 0 };
  }

  return null;
}

function pickAdditionalFlames(
  existing: FlameAnchor[],
  anchors: FlameAnchor[],
  targetCount: number,
) {
  if (targetCount <= existing.length) {
    return existing;
  }

  const nextFlames = [...existing];
  const remainingAnchors = anchors.filter(
    (anchor) =>
      !existing.some(
        (item) =>
          item.axis === anchor.axis &&
          item.offset === anchor.offset &&
          item.side === anchor.side,
      ),
  );

  while (nextFlames.length < targetCount && remainingAnchors.length > 0) {
    const index = Math.floor(Math.random() * remainingAnchors.length);
    const [selectedAnchor] = remainingAnchors.splice(index, 1);

    if (selectedAnchor) {
      nextFlames.push(selectedAnchor);
    }
  }

  return nextFlames;
}

function getFlamePositionStyle(anchor: FlameAnchor) {
  const style: CSSProperties = {
    animationDelay: `${Math.abs(
      Math.sin(anchor.offset.length * 10 + anchor.side.length),
    ) * 240}ms`,
  };

  if (anchor.axis === "x") {
    style.left = anchor.offset;
    style.top = anchor.side === "top" ? "-4px" : undefined;
    style.bottom = anchor.side === "bottom" ? "-4px" : undefined;
    style.transform =
      anchor.side === "top" ? "translateX(-50%)" : "translateX(-50%) scaleY(-1)";
    return style;
  }

  style.top = anchor.offset;
  style.left = anchor.side === "left" ? "-2px" : undefined;
  style.right = anchor.side === "right" ? "-2px" : undefined;
  style.transform =
    anchor.side === "left"
      ? "translateX(-8%) rotate(-28deg)"
      : "translateX(8%) rotate(28deg)";
  return style;
}

export function PracticeScreen({
  recommendation,
  best,
}: PracticeScreenProps) {
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [timeLeft, setTimeLeft] = useState(SPRINT_DURATION_SECONDS);
  const [currentAmount, setCurrentAmount] = useState<number | null>(null);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState<SprintResult | null>(null);
  const [results, setResults] = useState<SprintResult[]>([]);
  const [cardsPresented, setCardsPresented] = useState(0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [flashTone, setFlashTone] = useState<"success" | "danger" | null>(null);
  const [sectionFlames, setSectionFlames] = useState<FlameAnchor[]>([]);
  const [streakBoxFlames, setStreakBoxFlames] = useState<FlameAnchor[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((currentValue) => {
        if (currentValue <= 1) {
          setStatus("finished");
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status !== "finished" || !timeoutRef.current) {
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, [status]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const summary = useMemo(() => {
    const solvedCount = results.filter((result) => result.grade === "right").length;
    const closeCount = results.filter((result) => result.grade === "close").length;

    return {
      solvedCount,
      closeCount,
      currentStreak: getCurrentStreak(results),
      bestStreak: getBestStreak(results),
    };
  }, [results]);

  function moveToNextCard() {
    setCardsPresented((currentValue) => currentValue + 1);
    setCurrentAmount((previousAmount) =>
      buildSprintAmount(recommendation.testAmounts, previousAmount),
    );
    setAnswerInput("");
    setIsAdvancing(false);
  }

  function startSprint() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus("running");
    setTimeLeft(SPRINT_DURATION_SECONDS);
    setResults([]);
    setFeedback(null);
    setCardsPresented(1);
    setIsAdvancing(false);
    setFlashTone(null);
    setSectionFlames([]);
    setStreakBoxFlames([]);
    setAnswerInput("");
    setCurrentAmount(buildSprintAmount(recommendation.testAmounts, null));
  }

  function submitAnswer() {
    if (status !== "running" || currentAmount === null || isAdvancing) {
      return;
    }

    const parsedAnswer = Number(answerInput);

    if (!Number.isFinite(parsedAnswer) || parsedAnswer <= 0) {
      return;
    }

    const shortcutEstimate = applyFormulaToAmount(currentAmount, best.operations);
    const exact = currentAmount * recommendation.quote.rate;
    const exactRelativeMiss =
      Math.abs(parsedAnswer - exact) / Math.max(Math.abs(exact), 1);
    const shortcutRelativeMiss =
      Math.abs(parsedAnswer - shortcutEstimate) /
      Math.max(Math.abs(shortcutEstimate), 1);
    const result: SprintResult = {
      amount: currentAmount,
      answer: parsedAnswer,
      shortcutEstimate,
      exact,
      exactRelativeMiss,
      shortcutRelativeMiss,
      grade: hasSameDisplayedShortcutAnswer(
        parsedAnswer,
        shortcutEstimate,
        recommendation.quote.quoteCurrency,
      )
        ? "right"
        : exactRelativeMiss <= EXACT_CLOSE_ENOUGH_THRESHOLD
          ? "close"
          : "off",
    };
    const nextStreak = result.grade === "right" ? summary.currentStreak + 1 : 0;

    setResults((currentResults) => [...currentResults, result]);
    setFeedback(result);
    setIsAdvancing(true);
    setAnswerInput("");
    if (nextStreak < 2) {
      setStreakBoxFlames([]);
      setSectionFlames([]);
    } else {
      const streakBoxTarget =
        nextStreak === 2 ? 4 : STREAK_BOX_FLAME_ANCHORS.length;
      setStreakBoxFlames((currentFlames) =>
        pickAdditionalFlames(
          currentFlames,
          STREAK_BOX_FLAME_ANCHORS,
          streakBoxTarget,
        ),
      );

      if (nextStreak >= 3) {
        const sectionTarget = Math.min(
          SECTION_FLAME_ANCHORS.length,
          4 + (nextStreak - 3) * 2,
        );
        setSectionFlames((currentFlames) =>
          pickAdditionalFlames(
            currentFlames,
            SECTION_FLAME_ANCHORS,
            sectionTarget,
          ),
        );
      } else {
        setSectionFlames([]);
      }
    }

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }

    setFlashTone(result.grade === "off" ? "danger" : "success");
    flashTimeoutRef.current = setTimeout(() => {
      flashTimeoutRef.current = null;
      setFlashTone(null);
    }, 700);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;

      if (statusRef.current === "running") {
        moveToNextCard();
      }
    }, 1100);
  }

  const feedbackTone = feedback ? getResultTone(feedback.grade) : null;
  const flashFeedbackTone =
    flashTone === "success"
      ? getResultTone("right")
      : flashTone === "danger"
        ? getResultTone("off")
        : null;
  const streakVisual =
    status === "running" ? getStreakVisuals(summary.currentStreak) : null;
  const practiceSectionStyle = streakVisual
    ? ({
        "--practice-streak-tint": String(streakVisual.tint),
        "--practice-streak-glow": String(streakVisual.glow),
        "--practice-streak-fire": String(streakVisual.fire),
        "--practice-streak-shake": `${streakVisual.shake}px`,
      } as CSSProperties)
    : undefined;
  const practiceSectionClassName = [
    "relative overflow-hidden transition-all duration-150",
    streakVisual ? "practice-streak-shell" : "",
    summary.currentStreak >= 3 && streakVisual && streakVisual.shake > 0
      ? "practice-streak-shake"
      : "",
    flashTone ? (flashFeedbackTone?.sectionClassName ?? "") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-4">
      <SectionCard
        title={status === "finished" ? "Practice summary" : "60 seconds practice"}
        description={
          status === "finished"
            ? "See how well the formula held up once practice started."
            : "Make the formula feel natural before you need it in a store."
        }
        className={practiceSectionClassName}
        style={practiceSectionStyle}
      >
        {streakVisual ? (
          <>
            <div
              aria-hidden="true"
              className="practice-streak-aura pointer-events-none absolute inset-0 rounded-[28px]"
            />
            <div
              aria-hidden="true"
              className="practice-streak-halo pointer-events-none absolute inset-0 rounded-[28px]"
            />
            <div
              aria-hidden="true"
              className="practice-streak-border pointer-events-none absolute inset-0 rounded-[28px]"
            />
            {sectionFlames.map((anchor) => (
              <span
                key={`section-${anchor.side}-${anchor.offset}`}
                aria-hidden="true"
                className="practice-streak-flame pointer-events-none absolute"
                style={getFlamePositionStyle(anchor)}
              >
                🔥
              </span>
            ))}
          </>
        ) : null}
        {flashFeedbackTone ? (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-[2] rounded-[28px] transition-opacity duration-150 ${flashFeedbackTone.overlayClassName}`}
          />
        ) : null}
        <div className="relative z-10 space-y-4">
          <div className="-mx-5 -mt-1 border-b border-[var(--border)] bg-[linear-gradient(135deg,#1e4fd0_0%,#11295f_100%)] px-5 py-5 text-white">
            <ShortcutRail
              baseCurrency={recommendation.quote.baseCurrency}
              quoteCurrency={recommendation.quote.quoteCurrency}
              candidate={best}
              tone="primary"
            />
          </div>
          {status === "finished" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Solved
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-strong)]">
                  {summary.solvedCount} / {cardsPresented}
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-center">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Close enough
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-strong)]">
                  {summary.closeCount} / {cardsPresented}
                </p>
              </div>
            </div>
          ) : null}
          {status !== "finished" ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Time
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-strong)]">
                  {timeLeft}s
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Solved
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-strong)]">
                  {summary.solvedCount}
                </p>
              </div>
              <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
                {streakBoxFlames.map((anchor) => (
                  <span
                    key={`streak-box-${anchor.side}-${anchor.offset}`}
                    aria-hidden="true"
                    className="practice-streak-flame practice-streak-flame-small pointer-events-none absolute"
                    style={getFlamePositionStyle(anchor)}
                  >
                    🔥
                  </span>
                ))}
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Streak
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-strong)]">
                  {summary.currentStreak}
                </p>
              </div>
            </div>
          ) : null}

          {status === "idle" ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-4">
              <p className="text-[15px] leading-6 text-[var(--muted)]">
                You are about to see a rapid stream of prices in{" "}
                {recommendation.quote.baseCurrency}. Convert each one in your head
                using the formula, then lock your answer before the next price
                appears.
              </p>
              <button
                type="button"
                onClick={startSprint}
                className="mt-4 min-h-14 w-full rounded-3xl bg-[var(--accent)] px-5 text-[17px] font-semibold text-white"
              >
                Start practice
              </button>
            </div>
          ) : null}

          {status === "running" && currentAmount !== null ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitAnswer();
              }}
            >
              <div className="rounded-3xl bg-[linear-gradient(135deg,#1e4fd0_0%,#11295f_100%)] px-4 py-4 text-white">
                <p className="text-sm uppercase tracking-[0.22em] text-white/70">
                  Local price in store
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatCurrencyAmount(
                    currentAmount,
                    recommendation.quote.baseCurrency,
                  )}
                </p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Your home currency estimate
                </span>
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={answerInput}
                    onChange={(event) => setAnswerInput(event.target.value)}
                    placeholder={`Enter ${recommendation.quote.quoteCurrency} amount`}
                    className="min-h-14 w-full bg-transparent text-[22px] font-semibold tracking-tight text-[var(--accent-strong)] outline-none"
                  />
                </div>
              </label>
              <button
                type="submit"
                disabled={isAdvancing}
                className="min-h-14 w-full rounded-3xl bg-[var(--accent)] px-5 text-[17px] font-semibold text-white disabled:opacity-50"
              >
                {isAdvancing ? "Loading next card..." : "Submit"}
              </button>
            </form>
          ) : null}

          {status === "finished" ? (
            <button
              type="button"
              onClick={startSprint}
              className="min-h-14 w-full rounded-3xl bg-[var(--accent)] px-5 text-[17px] font-semibold text-white"
            >
              Run another practice
            </button>
          ) : null}
        </div>
      </SectionCard>

      {feedback && feedbackTone ? (
        <SectionCard
          title="Last round"
        >
          <div className="space-y-3">
            <div
              className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] ${feedbackTone.className}`}
            >
              {feedbackTone.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Your answer
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--accent-strong)]">
                  {formatCurrencyAmount(
                    feedback.answer,
                    recommendation.quote.quoteCurrency,
                  )}
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Formula result
                </p>
                <p className="mt-2 text-xl font-semibold text-[var(--accent-strong)]">
                  {formatCurrencyAmount(
                    feedback.shortcutEstimate,
                    recommendation.quote.quoteCurrency,
                  )}
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-6 text-[var(--muted)]">
              {feedback.grade === "right"
                ? "Your answer rounds to the same displayed formula result."
                : feedback.grade === "close"
                  ? "Not the formula result, but still within 10% of the real conversion."
                  : `Difference from formula result: ${formatPercent(
                      feedback.shortcutRelativeMiss,
                    )}`}
            </p>
          </div>
        </SectionCard>
      ) : null}

      {status !== "finished" ? (
        <SectionCard
          title="Why practice works"
          description="The goal is not exact finance math. The goal is fast shopping confidence."
        >
          <div className="space-y-3 text-[15px] leading-6 text-[var(--muted)]">
            <p>
              This practice trains the exact moment TripRate is built for: looking
              at a price tag and knowing roughly what it means before you reach
              for your phone.
            </p>
            <ul className="space-y-2 text-[var(--accent-strong)]">
              <li>1. Read the local price quickly.</li>
              <li>2. Run the formula in your head.</li>
              <li>3. Lock the answer before second-guessing yourself.</li>
              <li>4. Let the next round sharpen your instincts.</li>
            </ul>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
