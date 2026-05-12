import { calculateAverageError } from "./calculate-average-error";
import { classifyFormulaDifficulty } from "./classify-difficulty";
import { describeFormula, formatShortFormula } from "./describe-formula";
import type { FormulaCandidate, FormulaOperation } from "../types";

function buildEstimateSignature(candidate: FormulaCandidate) {
  return candidate.examples
    .map((example) => example.estimate.toFixed(10))
    .join("|");
}

function isNoOpCandidate(candidate: FormulaCandidate) {
  return candidate.examples.every(
    (example) => Math.abs(example.estimate - example.amount) < 1e-9,
  );
}

function getSimplicityPenalty(operations: FormulaOperation[]) {
  return operations.reduce((total, operation) => {
    switch (operation.type) {
      case "shift":
        return total + (Math.abs(operation.places) === 1 ? 0.45 : 0.7);
      case "multiply":
        return total + ([2, 5, 10].includes(operation.value) ? 0.4 : 0.8);
      case "divide":
        return total + ([2, 10].includes(operation.value) ? 0.45 : 0.85);
      case "percentAdjust":
        return total + (Math.abs(operation.value) === 10 ? 0.5 : Math.abs(operation.value) === 20 ? 0.8 : 1.05);
      case "add":
      case "subtract":
        return total + ([1, 2, 5].includes(operation.value) ? 0.55 : 0.95);
      default:
        return total;
    }
  }, operations.length * 0.9);
}

function getMemorabilityPenalty(operations: FormulaOperation[]) {
  const numberPenalty = operations.reduce((total, operation) => {
    switch (operation.type) {
      case "shift":
        return total + Math.abs(operation.places) * 0.18;
      case "multiply":
      case "divide":
        return total + (operation.value >= 7 ? 0.8 : operation.value >= 5 ? 0.5 : 0.3);
      case "percentAdjust":
        return total + (Math.abs(operation.value) === 10 ? 0.35 : Math.abs(operation.value) === 20 ? 0.55 : 0.75);
      case "add":
      case "subtract":
        return total + (operation.value >= 10 ? 0.8 : 0.35);
      default:
        return total;
    }
  }, 0);

  const operationKinds = new Set(operations.map((operation) => operation.type));
  const varietyPenalty = operationKinds.size * 0.3;

  return numberPenalty + varietyPenalty;
}

export function rankFormulas(
  rate: number,
  candidates: FormulaOperation[][],
  testAmounts: number[],
) {
  const rankedCandidates = candidates
    .map<FormulaCandidate | null>((operations) => {
      const evaluation = calculateAverageError(rate, operations, testAmounts);

      if (
        evaluation.examples.some(
          (example) => !Number.isFinite(example.estimate) || example.estimate < 0,
        )
      ) {
        return null;
      }

      const simplicityPenalty = getSimplicityPenalty(operations);
      const memorabilityPenalty = getMemorabilityPenalty(operations);
      const difficulty = classifyFormulaDifficulty(operations);
      const score =
        evaluation.averageRelativeError * 100 +
        simplicityPenalty * 1.8 +
        memorabilityPenalty * 1.2;

      return {
        id: formatShortFormula(operations),
        operations,
        shortLabel: formatShortFormula(operations),
        explanation: describeFormula(operations),
        difficulty: difficulty.level,
        difficultyReason: difficulty.reason,
        operationCount: difficulty.operationCount,
        examples: evaluation.examples,
        averageError: evaluation.averageError,
        averageRelativeError: evaluation.averageRelativeError,
        simplicityPenalty,
        memorabilityPenalty,
        score,
      };
    })
    .filter((candidate): candidate is FormulaCandidate => Boolean(candidate))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.averageRelativeError !== right.averageRelativeError) {
        return left.averageRelativeError - right.averageRelativeError;
      }

      return left.operations.length - right.operations.length;
    });

  const dedupedCandidates: FormulaCandidate[] = [];
  const seenSignatures = new Set<string>();

  for (const candidate of rankedCandidates) {
    if (isNoOpCandidate(candidate)) {
      continue;
    }

    const signature = buildEstimateSignature(candidate);

    if (seenSignatures.has(signature)) {
      continue;
    }

    seenSignatures.add(signature);
    dedupedCandidates.push(candidate);
  }

  return dedupedCandidates;
}
