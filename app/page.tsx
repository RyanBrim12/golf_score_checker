import { cookies } from 'next/headers';
import Dashboard from './components/Dashboard';
import SignOutButton from './components/SignOutButton';

async function getUserRole() {
  const sessionCookie = (await cookies()).get('golf_score_session')?.value;
  const role = sessionCookie?.split('.')[0];

  return role === 'viewer' || role === 'admin' ? role : null;
}

export default async function Home() {
  const userRole = await getUserRole();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">MTCC Score Dashboard</h1>
          <SignOutButton />
        </div>
        <Dashboard userRole={userRole} />
      </div>
    </main>
  );
}
