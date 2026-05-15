import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { profile } = useAuth();

  return (
    <main className="page">
      <section className="card">
        <h1>Dashboard</h1>
        <p className="muted">Your CreatorOS workspace is ready.</p>
        <pre>{profile ? JSON.stringify(profile, null, 2) : 'No profile loaded.'}</pre>
      </section>
    </main>
  );
}
