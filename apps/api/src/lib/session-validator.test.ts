import { describe, it, expect, vi } from 'vitest';
import { checkTrailheadSession, detectLoginRedirect } from './session-validator.js';
import type { PlaywrightMCPClient } from './mcp-client.js';

describe('checkTrailheadSession', () => {
  it('should return { valid: true } when snapshot does not contain "Log In" text', async () => {
    const mockClient = {
      callTool: vi.fn()
        .mockResolvedValueOnce({}) // browser_navigate
        .mockResolvedValueOnce({
          content: [{ text: 'Trailhead Home - Welcome back, user@example.com' }],
        }), // browser_snapshot
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result).toEqual({ valid: true });
    expect(mockClient.callTool).toHaveBeenCalledWith('browser_navigate', {
      url: 'https://trailhead.salesforce.com/en/home',
    });
    expect(mockClient.callTool).toHaveBeenCalledWith('browser_snapshot', {});
  });

  it('should return { valid: false } when snapshot contains "Log In" text', async () => {
    const mockClient = {
      callTool: vi.fn()
        .mockResolvedValueOnce({}) // browser_navigate
        .mockResolvedValueOnce({
          content: [{ text: 'Trailhead Home - Log In button visible' }],
        }), // browser_snapshot
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result).toEqual({ valid: false });
  });

  it('should return { valid: false, error: string } when callTool throws', async () => {
    const mockClient = {
      callTool: vi.fn().mockRejectedValueOnce(new Error('Connection failed')),
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Connection failed');
  });

  it('should return { valid: false, error: string } when error is not an Error instance', async () => {
    const mockClient = {
      callTool: vi.fn().mockRejectedValueOnce('Unknown error'),
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('should detect "Log In" in multi-block snapshot content (not only first block)', async () => {
    const mockClient = {
      callTool: vi.fn()
        .mockResolvedValueOnce({}) // browser_navigate
        .mockResolvedValueOnce({
          content: [
            { text: 'Trailhead Home - Page Header' },
            { text: 'Log In to continue' }, // "Log In" in second block
          ],
        }), // browser_snapshot
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result).toEqual({ valid: false });
  });

  it('should detect login indicators case-insensitively ("sign in" variant)', async () => {
    const mockClient = {
      callTool: vi.fn()
        .mockResolvedValueOnce({}) // browser_navigate
        .mockResolvedValueOnce({
          content: [{ text: 'Sign in to your account' }],
        }), // browser_snapshot
    } as unknown as PlaywrightMCPClient;

    const result = await checkTrailheadSession(mockClient);

    expect(result).toEqual({ valid: false });
  });
});

describe('detectLoginRedirect', () => {
  it('should return true for login.salesforce.com URLs', () => {
    const result = detectLoginRedirect('https://login.salesforce.com/services/oauth2/authorize');
    expect(result).toBe(true);
  });

  it('should return true for URLs with /login path', () => {
    const result = detectLoginRedirect('https://trailhead.salesforce.com/login');
    expect(result).toBe(true);
  });

  it('should return true for URLs with /login/ path', () => {
    const result = detectLoginRedirect('https://trailhead.salesforce.com/en/login');
    expect(result).toBe(true);
  });

  it('should return true for URLs with hyphenated locale prefix (e.g. /pt-br/login)', () => {
    expect(detectLoginRedirect('https://trailhead.salesforce.com/pt-br/login')).toBe(true);
  });

  it('should return true for URLs with 3-char locale prefix (e.g. /zh-cn/login)', () => {
    expect(detectLoginRedirect('https://trailhead.salesforce.com/zh-cn/login')).toBe(true);
  });

  it('should return false for regular Trailhead content URLs', () => {
    const result = detectLoginRedirect('https://trailhead.salesforce.com/en/content/learn/modules/unit');
    expect(result).toBe(false);
  });

  it('should return false for content URLs whose path ends in /login (false positive guard)', () => {
    // e.g. a module unit called "login" — must not trigger session expiry detection
    const result = detectLoginRedirect('https://trailhead.salesforce.com/en/content/learn/modules/mfa-basics/login');
    expect(result).toBe(false);
  });

  it('should return false for content URLs with /login/ in the middle of the path', () => {
    // e.g. a module about "login security" with sub-units — must not pause the scrape queue
    const result = detectLoginRedirect('https://trailhead.salesforce.com/content/learn/modules/login/step1');
    expect(result).toBe(false);
  });

  it('should return false for Trailhead home page', () => {
    const result = detectLoginRedirect('https://trailhead.salesforce.com/en/home');
    expect(result).toBe(false);
  });

  it('should handle malformed URLs with string fallback', () => {
    const result = detectLoginRedirect('not-a-valid-url-but-has-login.salesforce.com');
    expect(result).toBe(true);
  });

  it('should return false for malformed URLs without login pattern', () => {
    const result = detectLoginRedirect('not-a-valid-url');
    expect(result).toBe(false);
  });
});
