import type { KeepMode } from "@/types/domain";

export interface ParsedDiceTerm {
  type: "dice";
  sign: 1 | -1;
  count: number;
  sides: number;
  keep?: {
    mode: KeepMode;
    n: number;
  };
}

export interface ParsedModifierTerm {
  type: "mod";
  sign: 1 | -1;
  value: number;
}

export type ParsedTerm = ParsedDiceTerm | ParsedModifierTerm;

export interface ParsedDiceCommand {
  expression: string;
  label?: string;
  terms: ParsedTerm[];
}

export type ParseResult =
  | { ok: true; value: ParsedDiceCommand }
  | { ok: false; error: string };

const MAX_EXPR_LENGTH = 100;
const MAX_TERMS = 10;
const MAX_DICE_PER_TERM = 100;
const MIN_SIDES = 2;
const MAX_SIDES = 1000;

export function isDiceCommand(input: string): boolean {
  return /^\/(?:r|roll)(?:\s+|$)/i.test(input.trim());
}

const SINGLE_TERM_REGEX =
  /^([+-])?(?:(\d*)d(\d+|%)(?:(kh|kl|dh|dl)(\d+)?)?|(\d+))$/i;

function parseSingleTerm(rawTerm: string, isFirst: boolean):
  | { ok: true; term: ParsedTerm; normalized: string }
  | { ok: false; error: string } {
  const match = SINGLE_TERM_REGEX.exec(rawTerm);
  if (!match) {
    return {
      ok: false,
      error: `Termo de rolagem inválido: "${rawTerm}". Exemplo válido: /r 1d20+5 ou /r 4d6kh3`,
    };
  }

  const [, signChar, countStr, sidesStr, keepModeRaw, keepNStr, modValueStr] =
    match;
  const sign: 1 | -1 = signChar === "-" ? -1 : 1;
  const signPrefix = sign === -1 ? "-" : isFirst ? "" : "+";

  // Modificador inteiro (ex: +5, -2)
  if (modValueStr !== undefined) {
    const value = Number.parseInt(modValueStr, 10);
    if (!Number.isFinite(value) || value < 0 || value > 10000) {
      return {
        ok: false,
        error: "Modificador numérico fora do limite permitido (0 a 10000).",
      };
    }
    return {
      ok: true,
      term: { type: "mod", sign, value },
      normalized: `${signPrefix}${value}`,
    };
  }

  // Termo de dados (ex: 1d20, d%, 4d6kh3)
  const count = countStr ? Number.parseInt(countStr, 10) : 1;
  if (!Number.isFinite(count) || count < 1 || count > MAX_DICE_PER_TERM) {
    return {
      ok: false,
      error: `A quantidade de dados por termo deve ser entre 1 e ${MAX_DICE_PER_TERM}.`,
    };
  }

  const sides = sidesStr === "%" ? 100 : Number.parseInt(sidesStr, 10);
  if (!Number.isFinite(sides) || sides < MIN_SIDES || sides > MAX_SIDES) {
    return {
      ok: false,
      error: `O número de faces do dado deve ser entre ${MIN_SIDES} e ${MAX_SIDES}.`,
    };
  }

  let keep: ParsedDiceTerm["keep"] | undefined;
  let keepSuffix = "";
  if (keepModeRaw) {
    const mode = keepModeRaw.toLowerCase() as KeepMode;
    const n = keepNStr ? Number.parseInt(keepNStr, 10) : 1;
    if (!Number.isFinite(n) || n < 1 || n > count) {
      return {
        ok: false,
        error: `O modificador "${mode}${n}" deve manter/descartar entre 1 e ${count} dado(s).`,
      };
    }
    keep = { mode, n };
    keepSuffix = `${mode}${n}`;
  }

  return {
    ok: true,
    term: {
      type: "dice",
      sign,
      count,
      sides,
      ...(keep ? { keep } : {}),
    },
    normalized: `${signPrefix}${count}d${sidesStr === "%" ? "%" : sides}${keepSuffix}`,
  };
}

export function parseDiceExpression(
  rawBody: string
): ParseResult {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Informe a expressão de dados. Exemplo: /r 1d20+5",
    };
  }

  // Permite espaços opcionais ao redor de '+' e '-' enquanto separa o rótulo final
  // Ex: "1d20 + 5 Ataque com Espada" -> expr="1d20+5", label="Ataque com Espada"
  const tokens = trimmed.split(/\s+/);
  const exprParts: string[] = [];
  let pendingOp: string | null = null;
  let labelStartIndex = tokens.length;

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]!;

    if (exprParts.length === 0) {
      exprParts.push(tk);
      continue;
    }

    if ((tk === "+" || tk === "-") && pendingOp === null) {
      pendingOp = tk;
      continue;
    }

    if (pendingOp !== null) {
      // Verifica se `pendingOp + tk` começa com um termo de dado/número válido
      if (/^[0-9dD]/.test(tk)) {
        exprParts.push(`${pendingOp}${tk}`);
        pendingOp = null;
        continue;
      }
      // Caso contrário, o operador solto fazia parte do rótulo
      labelStartIndex = i - 1;
      pendingOp = null;
      break;
    }

    if (/^[+-][0-9dD]/.test(tk)) {
      exprParts.push(tk);
      continue;
    }

    labelStartIndex = i;
    break;
  }

  if (pendingOp !== null) {
    return {
      ok: false,
      error: `Expressão incompleta após o operador "${pendingOp}".`,
    };
  }

  const compactExpr = exprParts.join("");
  if (compactExpr.length > MAX_EXPR_LENGTH) {
    return {
      ok: false,
      error: `A expressão de dados excede ${MAX_EXPR_LENGTH} caracteres.`,
    };
  }

  const labelRaw = tokens.slice(labelStartIndex).join(" ").trim();
  const label = labelRaw.length > 0 ? labelRaw.slice(0, 80) : undefined;

  // Divide a expressão compacta em termos separados por + ou -
  const rawTerms = compactExpr.match(/[+-]?[^+-]+/g);
  if (!rawTerms || rawTerms.length === 0) {
    return {
      ok: false,
      error: "Expressão de dados inválida.",
    };
  }

  if (rawTerms.length > MAX_TERMS) {
    return {
      ok: false,
      error: `A rolagem pode ter no máximo ${MAX_TERMS} termos.`,
    };
  }

  const terms: ParsedTerm[] = [];
  const normalizedParts: string[] = [];

  for (let i = 0; i < rawTerms.length; i++) {
    const parsed = parseSingleTerm(rawTerms[i]!, i === 0);
    if (!parsed.ok) {
      return parsed;
    }
    terms.push(parsed.term);
    normalizedParts.push(parsed.normalized);
  }

  const hasAtLeastOneDie = terms.some((t) => t.type === "dice");
  if (!hasAtLeastOneDie) {
    return {
      ok: false,
      error: "A rolagem precisa conter pelo menos um dado (ex: 1d20).",
    };
  }

  return {
    ok: true,
    value: {
      expression: normalizedParts.join(""),
      ...(label ? { label } : {}),
      terms,
    },
  };
}

export function parseChatDiceCommand(input: string): ParseResult {
  const trimmed = input.trim();
  const match = /^\/(?:r|roll)(?:\s+(.*))?$/i.exec(trimmed);
  if (!match) {
    return {
      ok: false,
      error: "Comando inválido. Use /r ou /roll seguido dos dados (ex: /r 1d20+5).",
    };
  }

  return parseDiceExpression(match[1] ?? "");
}
