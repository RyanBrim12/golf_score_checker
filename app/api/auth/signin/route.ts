import { NextResponse } from 'next/server';
import { authenticateCredentials, createSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const role = await authenticateCredentials(username, password);

    if (!role) {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(createSessionCookie(role));
    return response;
  } catch {
    return NextResponse.json({ message: 'Invalid sign-in request.' }, { status: 400 });
  }
}
