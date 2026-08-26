'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
              <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" autoComplete="current-password" />
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
