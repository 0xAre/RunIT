import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/require-api-auth';
export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  const authError = await requireApiAuth(req);
  if (authError) return authError;

  const browserKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  return NextResponse.json({ apiKey: browserKey });
}
