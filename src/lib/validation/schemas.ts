import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um endereço de e-mail válido."),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "O nome de usuário deve ter entre 3 e 24 caracteres.")
    .max(24, "O nome de usuário deve ter entre 3 e 24 caracteres.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Use apenas letras, números, hífen (-) ou sublinhado (_)."
    ),
  email: z
    .string()
    .trim()
    .email("Informe um endereço de e-mail válido."),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const createCampaignSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "O título da campanha deve ter pelo menos 2 caracteres.")
    .max(80, "O título da campanha deve ter no máximo 80 caracteres."),
});

export const joinCampaignSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Informe um código de convite válido.")
    .max(16, "Código de convite inválido.")
    .transform((v) => v.toUpperCase()),
});

const safeImageUrlSchema = z
  .string()
  .trim()
  .max(100_000, "URL de imagem muito longa.")
  .refine(
    (v) =>
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("data:image/"),
    "URL de imagem inválida."
  );

export const createTokenSchema = z.object({
  sceneId: z.string().uuid("Cena inválida."),
  campaignId: z.string().uuid("Campanha inválida."),
  name: z
    .string()
    .trim()
    .min(1, "O nome do token deve ter entre 1 e 80 caracteres.")
    .max(80, "O nome do token deve ter entre 1 e 80 caracteres."),
  imageUrl: safeImageUrlSchema.nullable().optional(),
  size: z.number().finite().default(1).transform((v) => Math.min(Math.max(Math.round(v || 1), 1), 4)),
  hpMax: z.number().finite().default(10).transform((v) => Math.max(Math.round(v || 10), 1)),
  hpCurrent: z.number().finite().optional(),
  ownerId: z.string().uuid("Dono inválido.").nullable().optional(),
  characterId: z.string().uuid("Personagem inválido.").nullable().optional(),
  posX: z.number().finite().optional(),
  posY: z.number().finite().optional(),
});

export const updateTokenStatsSchema = z.object({
  tokenId: z.string().uuid("Token inválido."),
  campaignId: z.string().uuid("Campanha inválida."),
  name: z
    .string()
    .trim()
    .min(1, "Nome inválido.")
    .max(80, "Nome inválido.")
    .optional(),
  hpCurrent: z
    .number()
    .finite()
    .transform((v) => Math.max(Math.round(v), 0))
    .optional(),
  hpMax: z
    .number()
    .finite()
    .transform((v) => Math.max(Math.round(v), 1))
    .optional(),
  size: z
    .number()
    .finite()
    .transform((v) => Math.min(Math.max(Math.round(v), 1), 4))
    .optional(),
  ownerId: z.string().uuid("Dono inválido.").nullable().optional(),
  characterId: z.string().uuid("Personagem inválido.").nullable().optional(),
  isHidden: z.boolean().optional(),
  conditions: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
  ringColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor do anel inválida.")
    .nullable()
    .optional(),
  isLocked: z.boolean().optional(),
});

export const createSceneSchema = z.object({
  campaignId: z.string().uuid("Campanha inválida."),
  name: z
    .string()
    .trim()
    .min(1, "O nome da cena deve ter entre 1 e 80 caracteres.")
    .max(80, "O nome da cena deve ter entre 1 e 80 caracteres."),
});

export const updateSceneSettingsSchema = z.object({
  sceneId: z.string().uuid("Cena inválida."),
  campaignId: z.string().uuid("Campanha inválida."),
  name: z
    .string()
    .trim()
    .min(1, "O nome da cena deve ter entre 1 e 80 caracteres.")
    .max(80, "O nome da cena deve ter entre 1 e 80 caracteres."),
  map_url: safeImageUrlSchema.nullable(),
  map_width: z
    .number()
    .finite()
    .transform((v) => Math.min(Math.max(Math.round(v), 200), 10000)),
  map_height: z
    .number()
    .finite()
    .transform((v) => Math.min(Math.max(Math.round(v), 200), 10000)),
  grid_size: z
    .number()
    .finite()
    .transform((v) => Math.min(Math.max(Math.round(v), 10), 300)),
  grid_opacity: z
    .number()
    .finite()
    .transform((v) => Math.min(Math.max(v, 0), 1)),
  grid_type: z
    .enum(["none", "square", "hex_pointy", "hex_flat"])
    .optional(),
  grid_offset_x: z
    .number()
    .finite()
    .transform((v) => Math.round(v))
    .optional(),
  grid_offset_y: z
    .number()
    .finite()
    .transform((v) => Math.round(v))
    .optional(),
  snap_to_grid: z.boolean(),
  meters_per_cell: z
    .number()
    .finite()
    .transform((v) => Math.max(v, 0.1)),
  distance_rule: z.enum(["chebyshev", "euclidean", "alternating"]),
});

const sceneElementDataSchema = z.object({
  points: z.array(z.number().finite()).max(4000).optional(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
  radius: z.number().finite().optional(),
  angle: z.number().finite().optional(),
  stroke: z.string().max(32).optional(),
  fill: z.string().max(32).optional(),
  strokeWidth: z.number().finite().min(1).max(40).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  text: z.string().max(500).optional(),
  fontSize: z.number().finite().min(8).max(120).optional(),
  imageUrl: safeImageUrlSchema.optional(),
  label: z.string().max(80).optional(),
});

export const createSceneElementSchema = z.object({
  sceneId: z.string().uuid("Cena inválida."),
  campaignId: z.string().uuid("Campanha inválida."),
  layer: z
    .enum(["prop", "mount", "drawing", "text", "attachment"])
    .optional(),
  kind: z.enum([
    "freehand",
    "line",
    "rect",
    "circle",
    "cone",
    "polygon",
    "text",
    "image",
    "aura",
  ]),
  attachedToTokenId: z.string().uuid().nullable().optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  rotation: z.number().finite().optional(),
  data: sceneElementDataSchema,
  isHidden: z.boolean().optional(),
});

export const updateSceneElementSchema = z.object({
  elementId: z.string().uuid("Elemento inválido."),
  campaignId: z.string().uuid("Campanha inválida."),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  rotation: z.number().finite().optional(),
  attachedToTokenId: z.string().uuid().nullable().optional(),
  data: sceneElementDataSchema.optional(),
  isLocked: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

export const updateSceneFogSettingsSchema = z.object({
  sceneId: z.string().uuid("Cena inválida."),
  campaignId: z.string().uuid("Campanha inválida."),
  fogEnabled: z.boolean(),
  fogMode: z.enum(["static", "dynamic", "hybrid"]).optional(),
  fogColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor de névoa inválida.")
    .optional(),
});

export const createFogShapeSchema = z.object({
  sceneId: z.string().uuid("Cena inválida."),
  campaignId: z.string().uuid("Campanha inválida."),
  operation: z.enum(["cover", "reveal"]),
  shapeKind: z.enum(["rect", "circle", "polygon"]),
  data: z.object({
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    width: z.number().finite().optional(),
    height: z.number().finite().optional(),
    radius: z.number().finite().optional(),
    points: z.array(z.number().finite()).max(1000).optional(),
  }),
});

export const combatStateSchema = z.object({
  active: z.boolean(),
  round: z.number().int().min(1),
  turnIndex: z.number().int().min(0),
  combatants: z.array(
    z.object({
      tokenId: z.string(),
      name: z.string().min(1).max(80),
      initiative: z.number().finite(),
    })
  ),
});
