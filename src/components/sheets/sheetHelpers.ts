import type { SkillProficiency } from "@/types/domain";

export function formatSigned(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

export function nextProficiency(current: SkillProficiency): SkillProficiency {
  if (current === "none") return "proficient";
  if (current === "proficient") return "expertise";
  return "none";
}
