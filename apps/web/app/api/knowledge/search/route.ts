import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  const apiBaseUrl = process.env.API_BASE_URL;
  const bearerToken = process.env.API_BEARER_TOKEN;

  if (!apiBaseUrl || !bearerToken) {
    return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
  }

  // Forward all query params to Fastify
  const forwardUrl = new URL('/api/knowledge/search', apiBaseUrl);
  searchParams.forEach((value, key) => {
    forwardUrl.searchParams.set(key, value);
  });

  try {
    const response = await fetch(forwardUrl.toString(), {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      // Next.js caching: no-store for real-time search
      cache: 'no-store',
    });

    const data = (await response.json()) as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
