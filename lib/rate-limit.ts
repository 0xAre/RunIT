import { NextRequest, NextResponse } from 'next/server';

/** Simple in-memory sliding-window rate limiter per IP (resets on cold start). */
const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function checkRateLimit(req: NextRequest, label = 'default'): NextResponse | null {
  const key = `${label}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  bucket.count += 1;
  return null;
}
