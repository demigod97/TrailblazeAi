import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

import { retryModule } from './actions';
import { revalidatePath } from 'next/cache';

describe('Dashboard Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retryModule', () => {
    it('returns error when VPS_API_URL is not configured', async () => {
      const result = await retryModule('test-module-id');
      expect(result).toEqual({ error: 'Server configuration error' });
    });

    it('calls correct VPS URL with Bearer auth on success', async () => {
      process.env.VPS_API_URL = 'https://api.example.com';
      process.env.VPS_API_SECRET = 'test-secret';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as any);

      const result = await retryModule('test-module-id');

      expect(fetch).toHaveBeenCalledWith('https://api.example.com/api/modules/test-module-id/retry', {
        method: 'POST',
        headers: { Authorization: 'Bearer test-secret' },
      });

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard');

      delete process.env.VPS_API_URL;
      delete process.env.VPS_API_SECRET;
    });

    it('returns error when response is not ok', async () => {
      process.env.VPS_API_URL = 'https://api.example.com';
      process.env.VPS_API_SECRET = 'test-secret';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as any);

      const result = await retryModule('test-module-id');

      expect(result).toEqual({ error: 'Retry failed' });

      delete process.env.VPS_API_URL;
      delete process.env.VPS_API_SECRET;
    });

    it('returns error on fetch exception', async () => {
      process.env.VPS_API_URL = 'https://api.example.com';
      process.env.VPS_API_SECRET = 'test-secret';

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await retryModule('test-module-id');

      expect(result).toEqual({ error: 'Retry failed' });

      delete process.env.VPS_API_URL;
      delete process.env.VPS_API_SECRET;
    });
  });
});
