import type { PlaywrightMCPClient } from './mcp-client.js';

export interface SessionCheckResult {
  valid: boolean;
  error?: string;
}

export function detectLoginRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'login.salesforce.com' ||
      /^(\/[a-z]{2,3}(?:-[a-z]{2})?)?\/login$/i.test(parsed.pathname) ||
      parsed.pathname.startsWith('/login/')
    );
  } catch {
    // Malformed URL — check by string pattern as fallback (anchored to avoid false positives)
    return url.includes('login.salesforce.com') || /(?:^|\/)login(?:\/|$)/.test(url);
  }
}

export async function checkTrailheadSession(client: PlaywrightMCPClient): Promise<SessionCheckResult> {
  try {
    await client.callTool('browser_navigate', {
      url: 'https://trailhead.salesforce.com/en/home',
    });

    const snapshot = await client.callTool('browser_snapshot', {});

    // Extract text from all snapshot content blocks to check for login button.
    // Join all blocks so the check is not limited to the first content item.
    let snapshotText = '';
    if (
      snapshot !== null &&
      typeof snapshot === 'object' &&
      'content' in snapshot &&
      Array.isArray((snapshot as { content?: unknown[] }).content)
    ) {
      const content = (snapshot as { content: unknown[] }).content;
      snapshotText = content
        .map((item) =>
          item !== null && typeof item === 'object' && 'text' in item
            ? String((item as { text?: unknown }).text ?? '')
            : '',
        )
        .join('\n');
    }

    // If login indicators are present in the snapshot, session is invalid.
    // Case-insensitive to handle Trailhead rendering variants.
    const lower = snapshotText.toLowerCase();
    if (lower.includes('log in') || lower.includes('sign in')) {
      return { valid: false };
    }

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
