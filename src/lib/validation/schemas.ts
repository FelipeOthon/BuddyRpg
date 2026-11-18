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
