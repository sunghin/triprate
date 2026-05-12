import type { FormulaOperation } from "../types";

function formatCount(value: number) {
  const counts: Record<number, string> = {
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    20: "20",
  };

  return counts[value] ?? String(value);
}

export function formatShortFormula(operations: FormulaOperation[]) {
  return operations
    .map((operation) => {
      switch (operation.type) {
        case "shift":
          return operation.places > 0
            ? `+${"0".repeat(operation.places)}`
            : `-${"0".repeat(Math.abs(operation.places))}`;
        case "multiply":
          return `x${operation.value}`;
        case "divide":
          return `/${operation.value}`;
        case "percentAdjust":
          return operation.value > 0 ? `+${operation.value}%` : `${operation.value}%`;
        case "add":
          return `+${operation.value}`;
        case "subtract":
          return `-${operation.value}`;
        default:
          return "";
      }
    })
    .join(" -> ");
}

function describeOperation(operation: FormulaOperation) {
  switch (operation.type) {
    case "shift":
      return operation.places > 0
        ? `add ${formatCount(operation.places)} zero${
            operation.places === 1 ? "" : "s"
          }`
        : `remove ${formatCount(Math.abs(operation.places))} zero${
            Math.abs(operation.places) === 1 ? "" : "s"
          }`;
    case "multiply":
      return `multiply by ${operation.value}`;
    case "divide":
      return `divide by ${operation.value}`;
    case "percentAdjust":
      return operation.value > 0
        ? `add ${operation.value}%`
        : `subtract ${Math.abs(operation.value)}%`;
    case "add":
      return `add ${operation.value}`;
    case "subtract":
      return `subtract ${operation.value}`;
    default:
      return "";
  }
}

export function describeFormula(operations: FormulaOperation[]) {
  return operations
    .map((operation) => describeOperation(operation))
    .join(", then ");
}
