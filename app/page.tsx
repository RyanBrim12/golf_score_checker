import Dashboard from './components/Dashboard';

export default function Home() {
  return (
    <main className="page-shell">
      <div className="container">
        <h1>Golf Score Checker</h1>
        <p className="subtitle">View your Club Caddie tee sheet and GHIN scores in one dashboard.</p>
        <Dashboard />
      </div>
    </main>
  );
}
