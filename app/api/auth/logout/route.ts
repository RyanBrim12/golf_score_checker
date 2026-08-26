import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(clearSessionCookie());
  return response;
}