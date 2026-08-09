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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-t-2 border-b-2 border-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(108,99,255,0.4)]">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">AgentFlow</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group">
            <LayoutDashboard size={20} className="group-hover:text-primary transition-colors" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link href="/workflows" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group">
            <Workflow size={20} className="group-hover:text-secondary transition-colors" />
            <span className="font-medium">Workflows</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group">
            <Settings size={20} className="group-hover:text-gray-300 transition-colors" />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <button onClick={signOut} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:text-[#ff5252] hover:bg-[#ff5252]/10 transition-all duration-200">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-hero-gradient opacity-30 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
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
