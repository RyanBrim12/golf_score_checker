'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError(response.status === 429 ? 'Too many sign-in attempts. Please try again later.' : 'Invalid username or password.');
        setIsSubmitting(false);
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Unable to sign in right now.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">MTCC Score Dashboard</h1>
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="username" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <span className="relative mt-1 block">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-blue-600 hover:text-blue-800" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.09A10.94 10.94 0 0112 4.5c5 0 8.27 4.11 9.5 7.5a16.7 16.7 0 01-3.06 4.89M6.61 6.61C4.82 7.84 3.56 9.72 2.5 12c1.23 3.39 4.5 7.5 9.5 7.5a10.9 10.9 0 004.11-.8" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S5.77 4.5 12 4.5 21.5 12 21.5 12 18.23 19.5 12 19.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
          </div>
          {error ? <p className="mt-4 text-sm text-rose-700" role="alert">{error}</p> : null}
          <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
