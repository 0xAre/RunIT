import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Firebase imports removed for Edge compatibility

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow auth pages and public assets
  if (pathname.startsWith('/auth') || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  // Protected workspace routes
  if (pathname.startsWith('/workspace')) {
    // return NextResponse.redirect(new URL('/auth/signin', request.url));
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/workspace/:path*'],
};
