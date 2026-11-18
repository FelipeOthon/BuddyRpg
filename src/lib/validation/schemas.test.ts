import { describe, expect, it } from "vitest";
import {
  createCampaignSchema,
  createSceneSchema,
  createTokenSchema,
  joinCampaignSchema,
  loginSchema,
  signUpSchema,
  updateSceneSettingsSchema,
  updateTokenStatsSchema,
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

  it("validates and clamps token creation payload", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";
    const parsed = createTokenSchema.parse({
      sceneId: validUuid,
      campaignId: validUuid,
      name: "  Goblin  ",
      size: 9,
      hpMax: -5,
      imageUrl: "data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E",
    });

    expect(parsed.name).toBe("Goblin");
    expect(parsed.size).toBe(4);
    expect(parsed.hpMax).toBe(1);

    expect(
      createTokenSchema.safeParse({
        sceneId: validUuid,
        campaignId: validUuid,
        name: "Goblin",
        imageUrl: "javascript:alert(1)",
      }).success
    ).toBe(false);
  });

  it("validates token stats update and scene schemas", () => {
    const validUuid = "11111111-1111-4111-8111-111111111111";
    expect(
      updateTokenStatsSchema.safeParse({
        tokenId: validUuid,
        campaignId: validUuid,
        hpCurrent: -3,
      }).data?.hpCurrent
    ).toBe(0);

    expect(
      createSceneSchema.safeParse({
        campaignId: validUuid,
        name: "Taverna",
      }).success
    ).toBe(true);

    const scene = updateSceneSettingsSchema.parse({
      sceneId: validUuid,
      campaignId: validUuid,
      name: "Masmorra",
      map_url: "https://example.supabase.co/storage/v1/object/public/maps/m.png",
      map_width: 50000,
      map_height: 50,
      grid_size: 70,
      grid_opacity: 2,
      snap_to_grid: true,
      meters_per_cell: 0,
      distance_rule: "chebyshev",
    });

    expect(scene.map_width).toBe(10000);
    expect(scene.map_height).toBe(200);
    expect(scene.grid_opacity).toBe(1);
    expect(scene.meters_per_cell).toBe(0.1);
  });
});
