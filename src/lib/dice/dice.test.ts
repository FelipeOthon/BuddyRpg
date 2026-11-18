import { describe, expect, it } from "vitest";
import {
  isDiceCommand,
  parseChatDiceCommand,
  parseDiceExpression,
} from "./parser";
import { rollParsedCommand } from "./roller";

describe("dice parser and roller", () => {
  it("detects /r and /roll commands case-insensitively", () => {
    expect(isDiceCommand("/r 1d20")).toBe(true);
    expect(isDiceCommand("/roll 2d6+3")).toBe(true);
    expect(isDiceCommand("  /R 4d6kh3")).toBe(true);
    expect(isDiceCommand("Olá pessoal")).toBe(false);
    expect(isDiceCommand("/rugido")).toBe(false);
  });

  it("parses standard expressions with modifiers and optional label", () => {
    const res = parseChatDiceCommand("/roll 1d20+5 Teste de Percepção");
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.expression).toBe("1d20+5");
    expect(res.value.label).toBe("Teste de Percepção");
    expect(res.value.terms).toHaveLength(2);
  });

  it("supports spaces around + and - operators before label", () => {
    const res = parseChatDiceCommand("/r 2d6 + 1d4 - 2 Espada Flamejante");
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.expression).toBe("2d6+1d4-2");
    expect(res.value.label).toBe("Espada Flamejante");
    expect(res.value.terms).toHaveLength(3);
  });

  it("supports implicit 1d (d20) and percentile (d%)", () => {
    const res = parseChatDiceCommand("/r d20+d%");
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.value.expression).toBe("1d20+1d%");
    expect(res.value.terms[0]).toMatchObject({
      type: "dice",
      count: 1,
      sides: 20,
    });
    expect(res.value.terms[1]).toMatchObject({
      type: "dice",
      count: 1,
      sides: 100,
    });
  });

  it("evaluates 4d6kh3 keeping the 3 highest dice and dropping the lowest", () => {
    const parsed = parseChatDiceCommand("/r 4d6kh3+2 Força");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const seq = [5, 1, 6, 3];
    let idx = 0;
    const result = rollParsedCommand(parsed.value, () => seq[idx++]!);

    expect(result.total).toBe(16); // (5 + 6 + 3) + 2 = 16
    expect(result.label).toBe("Força");
    const diceTerm = result.terms[0]!;
    expect(diceTerm.type).toBe("dice");
    if (diceTerm.type === "dice") {
      expect(diceTerm.rolls).toEqual([
        { v: 5, kept: true },
        { v: 1, kept: false },
        { v: 6, kept: true },
        { v: 3, kept: true },
      ]);
      expect(diceTerm.subtotal).toBe(14);
    }
  });

  it("evaluates kl (keep lowest), dh (drop highest), and dl (drop lowest)", () => {
    const seq = [18, 4];
    let i = 0;
    const klParsed = parseDiceExpression("2d20kl1");
    expect(klParsed.ok).toBe(true);
    if (klParsed.ok) {
      const klRes = rollParsedCommand(klParsed.value, () => seq[i++]!);
      expect(klRes.total).toBe(4);
    }

    const seq2 = [2, 6, 4, 5];
    let j = 0;
    const dhParsed = parseDiceExpression("4d6dh1");
    expect(dhParsed.ok).toBe(true);
    if (dhParsed.ok) {
      const dhRes = rollParsedCommand(dhParsed.value, () => seq2[j++]!);
      // drops 6, keeps 2+4+5 = 11
      expect(dhRes.total).toBe(11);
    }

    let k = 0;
    const dlParsed = parseDiceExpression("4d6dl1");
    expect(dlParsed.ok).toBe(true);
    if (dlParsed.ok) {
      const dlRes = rollParsedCommand(dlParsed.value, () => seq2[k++]!);
      // drops 2, keeps 6+4+5 = 15
      expect(dlRes.total).toBe(15);
    }
  });

  it("rejects invalid syntax and out-of-bounds dice limits", () => {
    expect(parseChatDiceCommand("/r").ok).toBe(false);
    expect(parseChatDiceCommand("/r abc").ok).toBe(false);
    expect(parseChatDiceCommand("/r 101d6").ok).toBe(false);
    expect(parseChatDiceCommand("/r 1d1").ok).toBe(false);
    expect(parseChatDiceCommand("/r 1d2000").ok).toBe(false);
    expect(parseChatDiceCommand("/r 2d6kh3").ok).toBe(false);
    expect(parseChatDiceCommand("/r 5+5").ok).toBe(false);
  });
});
