import { applyFormulaToAmount } from "./apply-formula";
import type { FormulaExample, FormulaOperation } from "../types";

type FormulaEvaluation = {
  averageError: number;
  averageRelativeError: number;
  examples: FormulaExample[];
};

export function calculateAverageError(
  rate: number,
  operations: FormulaOperation[],
  testAmounts: number[],
): FormulaEvaluation {
  const examples = testAmounts.map((amount) => {
    const estimate = applyFormulaToAmount(amount, operations);
    const exact = amount * rate;
    const difference = estimate - exact;
    const relativeError = Math.abs(difference) / Math.max(Math.abs(exact), 1);

    return {
      amount,
      estimate,
      exact,
      difference,
      relativeError,
    };
  });

  const averageError =
    examples.reduce((total, example) => total + Math.abs(example.difference), 0) /
    examples.length;
  const averageRelativeError =
    examples.reduce((total, example) => total + example.relativeError, 0) /
    examples.length;

  return {
    averageError,
    averageRelativeError,
    examples,
  };
}
