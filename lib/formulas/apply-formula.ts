import type { FormulaOperation } from "../types";

export function applyFormulaToAmount(
  amount: number,
  operations: FormulaOperation[],
) {
  return operations.reduce((currentValue, operation) => {
    switch (operation.type) {
      case "shift":
        return currentValue * 10 ** operation.places;
      case "multiply":
        return currentValue * operation.value;
      case "divide":
        return currentValue / operation.value;
      case "percentAdjust":
        return currentValue * (1 + operation.value / 100);
      case "add":
        return currentValue + operation.value;
      case "subtract":
        return currentValue - operation.value;
      default:
        return currentValue;
    }
  }, amount);
}
