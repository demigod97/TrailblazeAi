import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  API_BEARER_TOKEN: z.string().min(1).default("dev-token"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  bearerToken: parsed.data.API_BEARER_TOKEN,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseServiceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
  databaseUrl: parsed.data.DATABASE_URL,
};
