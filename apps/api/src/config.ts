import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  API_BEARER_TOKEN: z.string().min(32, 'API_BEARER_TOKEN must be at least 32 characters'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  bearerToken: parsed.data.API_BEARER_TOKEN,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseServiceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
  openaiApiKey: parsed.data.OPENAI_API_KEY,
  databaseUrl: parsed.data.DATABASE_URL,
  nodeEnv: parsed.data.NODE_ENV,
};
