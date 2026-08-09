'use client';
import { useAuth, AuthProvider } from '../../contexts/AuthContext';
import { OrgProvider } from '../../contexts/OrganizationContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Workflow, Settings, LogOut } from 'lucide-react';
import Navbar from '../../components/ui/Navbar';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '250px', background: 'var(--surface)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>Agent Builder</div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px' }} className="btn-ghost">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link href="/workflows" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px' }} className="btn-ghost">
            <Workflow size={18} /> Workflows
          </Link>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', borderRadius: '8px' }} className="btn-ghost">
            <Settings size={18} /> Settings
          </Link>
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={signOut} className="btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </OrgProvider>
    </AuthProvider>
  );
}
