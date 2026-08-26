'use client';

export default function SignOutButton() {
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/signin');
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}