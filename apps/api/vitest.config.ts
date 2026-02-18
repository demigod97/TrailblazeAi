import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Provide test-only values for all required env vars (no defaults in config.ts).
    // These are NOT production secrets — they satisfy Zod validation during unit tests.
    // Supabase/DB calls are mocked in test files that import these modules.
    env: {
      API_BEARER_TOKEN: 'test-bearer-token-for-vitest-only-not-production',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-for-vitest-only',
      ANTHROPIC_API_KEY: 'sk-ant-test-key-for-vitest-only',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    },
  },
});
