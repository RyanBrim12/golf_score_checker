import Dashboard from './components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl mb-1">MTCC Score Dashboard</h1>
        <Dashboard />
      </div>
    </main>
  );
}
