import type {
  DiceRollSingle,
  RollResult,
  RollTermResult,
} from "@/types/domain";
import type { ParsedDiceCommand, ParsedDiceTerm } from "./parser";

export type DiceRng = (sides: number) => number;

const defaultRng: DiceRng = (sides: number) =>
  Math.floor(Math.random() * sides) + 1;

function evaluateDiceTerm(
  term: ParsedDiceTerm,
  rng: DiceRng
): RollTermResult {
  const rawValues: number[] = [];
  for (let i = 0; i < term.count; i++) {
    const v = rng(term.sides);
    rawValues.push(v);
  }

  // Determina quais índices são mantidos (kept = true)
  const keptIndices = new Set<number>();

  if (!term.keep) {
    for (let i = 0; i < rawValues.length; i++) {
      keptIndices.add(i);
    }
  } else {
    const indexed = rawValues.map((v, idx) => ({ v, idx }));
    const { mode, n } = term.keep;

    if (mode === "kh") {
      // Mantém os N maiores
      indexed
        .sort((a, b) => b.v - a.v || a.idx - b.idx)
        .slice(0, n)
        .forEach((item) => keptIndices.add(item.idx));
    } else if (mode === "kl") {
      // Mantém os N menores
      indexed
        .sort((a, b) => a.v - b.v || a.idx - b.idx)
        .slice(0, n)
        .forEach((item) => keptIndices.add(item.idx));
    } else if (mode === "dh") {
      // Descarta os N maiores -> mantém (count - N) menores
      const keepCount = Math.max(term.count - n, 0);
      indexed
        .sort((a, b) => b.v - a.v || a.idx - b.idx)
        .slice(n, n + keepCount)
        .forEach((item) => keptIndices.add(item.idx));
    } else if (mode === "dl") {
      // Descarta os N menores -> mantém (count - N) maiores
      const keepCount = Math.max(term.count - n, 0);
      indexed
        .sort((a, b) => a.v - b.v || a.idx - b.idx)
        .slice(n, n + keepCount)
        .forEach((item) => keptIndices.add(item.idx));
    }
  }

  const rolls: DiceRollSingle[] = rawValues.map((v, idx) => ({
    v,
    kept: keptIndices.has(idx),
  }));

  const rawSum = rolls.reduce((acc, r) => (r.kept ? acc + r.v : acc), 0);
  const subtotal = term.sign * rawSum;

  return {
    type: "dice",
    sign: term.sign,
    count: term.count,
    sides: term.sides,
    ...(term.keep ? { keep: term.keep } : {}),
    rolls,
    subtotal,
  };
}

export function rollParsedCommand(
  command: ParsedDiceCommand,
  rng: DiceRng = defaultRng
): RollResult {
  const evaluatedTerms: RollTermResult[] = command.terms.map((term) => {
    if (term.type === "mod") {
      return {
        type: "mod",
        sign: term.sign,
        value: term.value,
      };
    }
    return evaluateDiceTerm(term, rng);
  });

  const total = evaluatedTerms.reduce((acc, t) => {
    if (t.type === "mod") {
      return acc + t.sign * t.value;
    }
    return acc + t.subtotal;
  }, 0);

  return {
    expression: command.expression,
    ...(command.label ? { label: command.label } : {}),
    terms: evaluatedTerms,
    total,
  };
}
