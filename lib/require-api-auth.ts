import { NextRequest, NextResponse } from 'next/server';

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.REQUIRE_API_AUTH === 'true' ||
    !!process.env.K_SERVICE ||
    !!process.env.FUNCTION_TARGET ||
    !!process.env.FIREBASE_CONFIG
  );
}

async function verifyFirebaseIdToken(token: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return false;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  );

  return res.ok;
}

export async function requireApiAuth(req: NextRequest): Promise<NextResponse | null> {
  if (!isProductionRuntime()) {
    return null;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  try {
    const valid = await verifyFirebaseIdToken(token);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Auth verification failed' }, { status: 401 });
  }
}
