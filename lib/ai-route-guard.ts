import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

/** Auth + per-IP rate limit for expensive AI API routes. */
export async function requireAiRoute(req: NextRequest): Promise<NextResponse | null> {
  const rateLimited = checkRateLimit(req, 'ai');
  if (rateLimited) return rateLimited;
  return requireApiAuth(req);
}
