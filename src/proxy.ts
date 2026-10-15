import { NextResponse, type NextRequest } from 'next/server';

// Single-user gate: HTTP Basic Auth against APP_PASSWORD (any username).
// Keeps strangers off the site and, more importantly, off /api/analyze, which spends Claude credits.

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('APP_PASSWORD is not configured on the server.', { status: 503 });
    }
    return NextResponse.next(); // local dev without a password
  }

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(supplied, password)) return NextResponse.next();
    } catch {
      // fall through to the challenge
    }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="AchwanyaNeural", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
