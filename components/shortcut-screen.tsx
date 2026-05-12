"use client";

import { useState } from "react";
import { DifficultySelector } from "@/components/difficulty-selector";
import { SectionCard } from "@/components/section-card";
import { ShortcutRail, formatOperationStep } from "@/components/shortcut-rail";
import {
  formatCurrencyAmount,
  formatPercent,
  formatRateValue,
} from "@/lib/formatting";
import { applyFormulaToAmount } from "@/lib/formulas/apply-formula";
import type {
  DifficultyAvailability,
  FormulaCandidate,
  ShortcutRecommendation,
  UserDifficultyLevel,
} from "@/lib/types";

type ShortcutScreenProps = {
  recommendation: ShortcutRecommendation;
  best: FormulaCandidate;
  alternates: FormulaCandidate[];
  selectedDifficulty: UserDifficultyLevel;
  difficultyAvailability: DifficultyAvailability;
  onDifficultyChange: (difficulty: UserDifficultyLevel) => void;
  onSelectFormula: (formulaId: string) => void;
  onRefresh: () => void;
  onSwap: () => void;
  onOpenPractice: () => void;
  isLoading: boolean;
};

type WalkthroughStage = {
  label: string;
  value: string;
  accent: boolean;
};

function formatWalkthroughNumber(value: number) {
  const absValue = Math.abs(value);

  if (absValue >= 10000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: absValue >= 100000 ? 0 : 1,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : value >= 1 ? 2 : 3,
  }).format(value);
}

function getWalkthroughCardClasses(dense: boolean, accent: boolean) {
  return `rounded-2xl border px-2 py-2 text-center ${
    accent
      ? "border-[rgba(30,79,208,0.16)] bg-[var(--accent-soft)]"
      : "border-[rgba(30,79,208,0.12)] bg-white shadow-[0_10px_24px_rgba(17,41,95,0.06)]"
  } ${dense ? "min-h-[3.8rem]" : "min-h-[4.3rem]"}`;
}

function getWalkthroughLabelClasses(dense: boolean, accent: boolean) {
  return `font-semibold uppercase tracking-[0.18em] ${
    accent ? "text-[var(--accent)]" : "text-[var(--muted)]"
  } ${dense ? "text-[9px]" : "text-[10px]"}`;
}

function getWalkthroughValueClasses(dense: boolean) {
  return `mt-1 font-semibold leading-none tracking-tight text-[var(--accent-strong)] ${
    dense ? "text-[12px]" : "text-[14px]"
  }`;
}

function buildWalkthroughStages(
  recommendation: ShortcutRecommendation,
  best: FormulaCandidate,
  estimate: number,
  amount: number,
) {
  const stages: WalkthroughStage[] = [
    {
      label: recommendation.quote.baseCurrency,
      value: formatWalkthroughNumber(amount),
      accent: false,
    },
  ];

  if (best.operationCount === 0) {
    return [
      ...stages,
      {
        label: "1:1",
        value: formatWalkthroughNumber(estimate),
        accent: true,
      },
      {
        label: recommendation.quote.quoteCurrency,
        value: formatWalkthroughNumber(estimate),
        accent: false,
      },
    ];
  }

  const operationNodes = best.operations.flatMap((operation, index) => {
    const step = formatOperationStep(operation);
    const resultValue = applyFormulaToAmount(amount, best.operations.slice(0, index + 1));

    return {
      label: step.detail,
      value: formatWalkthroughNumber(resultValue),
      accent: true,
    };
  });

  return [
    ...stages,
    ...operationNodes,
    {
      label: recommendation.quote.quoteCurrency,
      value: formatWalkthroughNumber(estimate),
      accent: false,
    },
  ];
}

export function ShortcutScreen({
  recommendation,
  best,
  alternates,
  selectedDifficulty,
  difficultyAvailability,
  onDifficultyChange,
  onSelectFormula,
  onRefresh,
  onSwap,
  onOpenPractice,
  isLoading,
}: ShortcutScreenProps) {
  const examples = best.examples.slice(0, 4);
  const isParityShortcut = best.operationCount === 0;
  const [expandedExampleAmount, setExpandedExampleAmount] = useState<number | null>(
    null,
  );

  function openExampleWalkthrough(amount: number) {
    setExpandedExampleAmount((currentAmount) =>
      currentAmount === amount ? null : amount,
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Here's our recommended formula"
        className="overflow-hidden"
      >
        <div className="-mx-5 -mt-1 mb-5 border-b border-[var(--border)] bg-[linear-gradient(135deg,#1e4fd0_0%,#11295f_100%)] px-5 py-5 text-white">
          <div>
            <ShortcutRail
              baseCurrency={recommendation.quote.baseCurrency}
              quoteCurrency={recommendation.quote.quoteCurrency}
              candidate={best}
              tone="primary"
            />
          </div>
          {best.operationCount === 0 ? (
            <p className="mt-3 max-w-[28ch] text-[15px] leading-6 text-white/82">
              {best.explanation}
            </p>
          ) : null}
          {!isParityShortcut ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-[12px] text-white/74">
              {best.operations.map((operation, index) => {
                const step = formatOperationStep(operation);

                return (
                  <span
                    key={`${best.id}-legend-${index}`}
                    className="rounded-full border border-white/16 bg-white/8 px-3 py-1"
                  >
                    {step.detail} = {step.title}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <DifficultySelector
            selectedDifficulty={selectedDifficulty}
            availability={difficultyAvailability}
            onChange={onDifficultyChange}
          />

          <button
            type="button"
            onClick={onSwap}
            disabled={isLoading}
            className="min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-strong)] px-4 text-[15px] font-semibold text-[var(--accent-strong)] disabled:opacity-50"
          >
            Swap conversion direction
          </button>

          <button
            type="button"
            onClick={onOpenPractice}
            className="min-h-14 w-full rounded-3xl bg-[var(--accent)] px-5 text-[17px] font-semibold text-white"
          >
            Practice this formula!
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Examples"
        description="Tap an amount to see a walkthrough using the recommended formula."
      >
        <div className="space-y-3">
          {examples.map((example) => {
            const isExpanded = expandedExampleAmount === example.amount;
            const walkthroughStages = buildWalkthroughStages(
              recommendation,
              best,
              example.estimate,
              example.amount,
            );
            const denseWalkthrough = walkthroughStages.length >= 5;
            const walkthroughTemplateColumns = `repeat(${walkthroughStages.length}, minmax(0, 1fr))`;

            return (
              <div key={example.amount} className="space-y-2">
                <button
                  type="button"
                  onClick={() => openExampleWalkthrough(example.amount)}
                  className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[17px] font-semibold text-[var(--accent-strong)]">
                        {formatCurrencyAmount(
                          example.amount,
                          recommendation.quote.baseCurrency,
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[17px] font-semibold text-[var(--accent)]">
                          {formatCurrencyAmount(
                            example.estimate,
                            recommendation.quote.quoteCurrency,
                          )}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[18px] text-[var(--accent-strong)] transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          ▾
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Exact{" "}
                      {formatCurrencyAmount(
                        example.exact,
                        recommendation.quote.quoteCurrency,
                      )}{" "}
                      · missed by {formatPercent(example.relativeError)}
                    </p>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Walkthrough
                    </p>
                    <div className="mt-3 rounded-[28px] border border-[var(--border)] bg-white/75 px-3 py-3 sm:px-4">
                      <div
                        className="grid items-center gap-2"
                        style={{ gridTemplateColumns: walkthroughTemplateColumns }}
                      >
                        {walkthroughStages.map((stage, index) => (
                          <div
                            key={`${best.id}-walkthrough-stage-${example.amount}-${index}`}
                            className={getWalkthroughCardClasses(
                              denseWalkthrough,
                              stage.accent,
                            )}
                          >
                            <p
                              className={getWalkthroughLabelClasses(
                                denseWalkthrough,
                                stage.accent,
                              )}
                            >
                              {stage.label}
                            </p>
                            <p
                              className={getWalkthroughValueClasses(
                                denseWalkthrough,
                              )}
                            >
                              {stage.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[linear-gradient(135deg,#1e4fd0_0%,#11295f_100%)] px-4 py-3 text-white">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                          Formula result
                        </p>
                        <p className="mt-1 text-[18px] font-semibold">
                          {formatCurrencyAmount(
                            example.estimate,
                            recommendation.quote.quoteCurrency,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                          Exact result
                        </p>
                        <p className="mt-1 text-[18px] font-semibold text-[var(--accent-strong)]">
                          {formatCurrencyAmount(
                            example.exact,
                            recommendation.quote.quoteCurrency,
                          )}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
                          Missed by {formatPercent(example.relativeError)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {alternates.length > 0 ? (
        <SectionCard
          title="Alternate formulas"
          description="Use these only if the recommended formula doesn't feel natural."
        >
          <div className="space-y-3">
            {alternates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => onSelectFormula(candidate.id)}
                className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-left transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Alternate formula
                  </p>
                  <span className="text-sm font-semibold text-[var(--accent)]">
                    Use this formula
                  </span>
                </div>
                <div className="mt-3">
                  <ShortcutRail
                    baseCurrency={recommendation.quote.baseCurrency}
                    quoteCurrency={recommendation.quote.quoteCurrency}
                    candidate={candidate}
                    tone="neutral"
                  />
                </div>
                {candidate.operationCount === 0 ? (
                  <p className="mt-3 text-center text-[15px] leading-6 text-[var(--muted)]">
                    {candidate.explanation}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap justify-center gap-2 text-[12px] text-[var(--muted)]">
                    {candidate.operations.map((operation, index) => {
                      const step = formatOperationStep(operation);

                      return (
                        <span
                          key={`${candidate.id}-legend-${index}`}
                          className="rounded-full border border-[var(--border)] bg-white px-3 py-1"
                        >
                          {step.detail} = {step.title}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <p className="px-1 text-xs leading-5 text-[var(--muted)]">
        Reference used: 1 {recommendation.quote.baseCurrency} ={" "}
        {formatRateValue(
          recommendation.quote.rate,
          recommendation.quote.quoteCurrency,
        )}{" "}
        {recommendation.quote.quoteCurrency}. Source:{" "}
        {recommendation.quote.source === "live" ? (
          <>
            <a
              href="https://frankfurter.dev"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[0.08em] underline-offset-2"
            >
              Frankfurter
            </a>{" "}
            (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="underline decoration-[0.08em] underline-offset-2 disabled:no-underline disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh rate"}
            </button>
            )
          </>
        ) : (
          <>
            fallback reference rate (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="underline decoration-[0.08em] underline-offset-2 disabled:no-underline disabled:opacity-50"
            >
              {isLoading ? "Refreshing..." : "Refresh rate"}
            </button>
            )
          </>
        )}
      </p>
    </div>
  );
}
