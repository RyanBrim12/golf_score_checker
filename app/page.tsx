import Dashboard from './components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Golf Score Checker</h1>
        <p className="mt-2 mb-6 text-base text-slate-600 sm:text-lg">
          View your Club Caddie tee sheet and GHIN scores in one dashboard.
        </p>
        <Dashboard />
      </div>
    </main>
  );
}
