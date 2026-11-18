import { describe, expect, it } from "vitest";
import {
  createCampaignSchema,
  joinCampaignSchema,
  loginSchema,
  signUpSchema,
} from "./schemas";

describe("validation schemas", () => {
  it("validates login credentials", () => {
    expect(
      loginSchema.safeParse({ email: "gm@buddyrpg.com", password: "secret" })
        .success
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "invalido", password: "123" }).success
    ).toBe(false);
  });

  it("validates signup username and email", () => {
    expect(
      signUpSchema.safeParse({
        username: "mestre_01",
        email: "gm@buddyrpg.com",
        password: "secret",
      }).success
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        username: "a!",
        email: "gm@buddyrpg.com",
        password: "secret",
      }).success
    ).toBe(false);
  });

  it("normalizes invite code to uppercase", () => {
    const parsed = joinCampaignSchema.parse({ code: "  a1b2c3d4 " });
    expect(parsed.code).toBe("A1B2C3D4");
  });

  it("validates campaign title length", () => {
    expect(createCampaignSchema.safeParse({ title: "A" }).success).toBe(false);
    expect(
      createCampaignSchema.safeParse({ title: "A Maldição de Strahd" }).success
    ).toBe(true);
  });
});
