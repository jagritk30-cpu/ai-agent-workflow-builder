import os

base_dir = "/Users/jagritpandit/AI agent workflow builder"

files = {
"src/app/globals.css": """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --bg: #0a0a0f;
  --surface: #12121a;
  --card: rgba(26, 26, 46, 0.7);
  --primary: #6c63ff;
  --secondary: #00d4ff;
  --success: #00e676;
  --warning: #ffb74d;
  --error: #ff5252;
  --text: #e8eaf6;
  --muted: #7986cb;
  
  --border-radius: 12px;
  --shadow: 0 4px 24px -4px rgba(0,0,0,0.5);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
}

.glass {
  background: var(--card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.gradient-text {
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gradient-border {
  position: relative;
  border-radius: var(--border-radius);
  background: var(--surface);
  background-clip: padding-box;
  border: 1px solid transparent;
}
.gradient-border::before {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  z-index: -1;
  margin: -1px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--surface); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

button { font-family: inherit; cursor: pointer; border-radius: 8px; border: none; font-weight: 500; transition: all 0.2s; padding: 10px 16px; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: #5a52d9; transform: translateY(-1px); }
.btn-secondary { background: var(--secondary); color: #000; }
.btn-secondary:hover { background: #00b8e6; }
.btn-ghost { background: transparent; color: var(--text); border: 1px solid rgba(255,255,255,0.1); }
.btn-ghost:hover { background: rgba(255,255,255,0.05); }
.btn-danger { background: var(--error); color: #fff; }

input, textarea, select {
  width: 100%; padding: 10px; border-radius: 8px;
  background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
  color: var(--text); font-family: inherit;
}
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--primary); }

.badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block; }
.badge-running { background: rgba(108, 99, 255, 0.2); color: var(--primary); }
.badge-completed { background: rgba(0, 230, 118, 0.2); color: var(--success); }
.badge-failed { background: rgba(255, 82, 82, 0.2); color: var(--error); }
.badge-paused, .badge-awaiting { background: rgba(255, 183, 77, 0.2); color: var(--warning); }
.badge-pending { background: rgba(121, 134, 203, 0.2); color: var(--muted); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
@keyframes spin { 100% { transform: rotate(360deg); } }
""",
"src/app/layout.tsx": """
import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { NhostProvider } from '@nhost/nextjs';
import { nhost } from '../lib/nhost';
import ApolloProviderWrapper from '../lib/apollo';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Build and run AI agent workflows seamlessly',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NhostProvider nhost={nhost}>
          <ApolloProviderWrapper>
            {children}
          </ApolloProviderWrapper>
        </NhostProvider>
      </body>
    </html>
  );
}
""",
"src/lib/nhost.ts": """
import { NhostClient } from '@nhost/nextjs';

export const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local',
  region: process.env.NEXT_PUBLIC_NHOST_REGION || '',
});
""",
"src/lib/apollo.ts": """
'use client';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { nhost } from './nhost';
import { useMemo } from 'react';

export default function ApolloProviderWrapper({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: nhost.graphql.httpUrl,
      headers: {
        Authorization: `Bearer ${nhost.auth.getAccessToken()}`
      }
    });

    const wsLink = new GraphQLWsLink(createClient({
      url: nhost.graphql.wsUrl,
      connectionParams: () => {
        return {
          headers: {
            Authorization: `Bearer ${nhost.auth.getAccessToken()}`
          }
        }
      }
    }));

    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      wsLink,
      httpLink
    );

    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
""",
"src/graphql/queries.ts": """
import { gql } from '@apollo/client';

export const GET_ORG_WORKFLOWS = gql`
  query GetOrgWorkflows($org_id: uuid!) {
    workflows(where: { org_id: { _eq: $org_id } }) {
      id
      name
      description
      steps { id }
      triggers { id type }
      runs(order_by: { created_at: desc }, limit: 1) { status }
    }
  }
`;

export const GET_WORKFLOW_DETAIL = gql`
  query GetWorkflowDetail($id: uuid!) {
    workflow(id: $id) {
      id
      name
      description
      steps(order_by: { order: asc }) {
        id
        type
        name
        config
        order
      }
      triggers {
        id
        type
        config
      }
    }
  }
`;

export const GET_ORG_MEMBERS = gql`
  query GetOrgMembers($org_id: uuid!) {
    org_members(where: { org_id: { _eq: $org_id } }) {
      id
      user_id
      role
      user {
        displayName
        email
      }
    }
  }
`;

export const GET_ORG_USAGE = gql`
  query GetOrgUsage($org_id: uuid!) {
    orgs_by_pk(id: $org_id) {
      quota_used
      quota_limit
    }
  }
`;

export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
      id
      status
      started_at
      completed_at
      step_runs(order_by: { started_at: asc }) {
        id
        step_id
        status
        started_at
        completed_at
        input
        output
        error
        step {
          name
          type
        }
      }
    }
  }
`;
""",
"src/graphql/mutations.ts": """
import { gql } from '@apollo/client';

export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($name: String!, $description: String, $org_id: uuid!) {
    insert_workflows_one(object: { name: $name, description: $description, org_id: $org_id }) {
      id
    }
  }
`;

export const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow($id: uuid!, $name: String, $description: String) {
    update_workflows_by_pk(pk_columns: { id: $id }, _set: { name: $name, description: $description }) {
      id
    }
  }
`;

export const DELETE_WORKFLOW = gql`
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) { id }
  }
`;

export const CREATE_WORKFLOW_STEP = gql`
  mutation CreateWorkflowStep($workflow_id: uuid!, $name: String!, $type: String!, $config: jsonb, $order: Int!) {
    insert_workflow_steps_one(object: { workflow_id: $workflow_id, name: $name, type: $type, config: $config, order: $order }) {
      id
    }
  }
`;

export const UPDATE_WORKFLOW_STEP = gql`
  mutation UpdateWorkflowStep($id: uuid!, $name: String, $config: jsonb, $order: Int) {
    update_workflow_steps_by_pk(pk_columns: { id: $id }, _set: { name: $name, config: $config, order: $order }) {
      id
    }
  }
`;

export const DELETE_WORKFLOW_STEP = gql`
  mutation DeleteWorkflowStep($id: uuid!) {
    delete_workflow_steps_by_pk(id: $id) { id }
  }
`;

export const REORDER_WORKFLOW_STEPS = gql`
  mutation ReorderSteps($updates: [workflow_steps_updates!]!) {
    update_workflow_steps_many(updates: $updates) {
      affected_rows
    }
  }
`;

export const CREATE_WORKFLOW_TRIGGER = gql`
  mutation CreateWorkflowTrigger($workflow_id: uuid!, $type: String!, $config: jsonb) {
    insert_workflow_triggers_one(object: { workflow_id: $workflow_id, type: $type, config: $config }) {
      id
    }
  }
`;

export const UPDATE_WORKFLOW_TRIGGER = gql`
  mutation UpdateWorkflowTrigger($id: uuid!, $config: jsonb) {
    update_workflow_triggers_by_pk(pk_columns: { id: $id }, _set: { config: $config }) {
      id
    }
  }
`;

export const DELETE_WORKFLOW_TRIGGER = gql`
  mutation DeleteWorkflowTrigger($id: uuid!) {
    delete_workflow_triggers_by_pk(id: $id) { id }
  }
`;

export const TRIGGER_WORKFLOW_RUN = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!) {
    trigger_workflow(workflow_id: $workflow_id) {
      run_id
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: uuid!) {
    approve_step_run(step_run_id: $step_run_id) {
      success
    }
  }
`;

export const ADD_ORG_MEMBER = gql`
  mutation AddOrgMember($org_id: uuid!, $user_id: uuid!, $role: String!) {
    insert_org_members_one(object: { org_id: $org_id, user_id: $user_id, role: $role }) {
      id
    }
  }
`;

export const REMOVE_ORG_MEMBER = gql`
  mutation RemoveOrgMember($id: uuid!) {
    delete_org_members_by_pk(id: $id) { id }
  }
`;

export const UPDATE_ORG_MEMBER_ROLE = gql`
  mutation UpdateOrgMemberRole($id: uuid!, $role: String!) {
    update_org_members_by_pk(pk_columns: { id: $id }, _set: { role: $role }) { id }
  }
`;
`,
"src/graphql/subscriptions.ts": """
import { gql } from '@apollo/client';

export const STEP_RUNS_SUBSCRIPTION = gql`
  subscription StepRunsSubscription($run_id: uuid!) {
    step_runs(where: { workflow_run_id: { _eq: $run_id } }, order_by: { started_at: asc }) {
      id
      step_id
      status
      started_at
      completed_at
      input
      output
      error
      step {
        name
        type
      }
    }
  }
`;

export const WORKFLOW_RUN_SUBSCRIPTION = gql`
  subscription WorkflowRunSubscription($id: uuid!) {
    workflow_runs_by_pk(id: $id) {
      id
      status
      started_at
      completed_at
    }
  }
`;
""",
"src/contexts/AuthContext.tsx": """
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuthenticationStatus, useUserData } from '@nhost/nextjs';
import { nhost } from '../lib/nhost';

type AuthContextType = {
  user: any;
  isLoading: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true, signOut: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuthenticationStatus();
  const user = useUserData();

  const signOut = async () => {
    await nhost.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
""",
"src/contexts/OrgContext.tsx": """
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery } from '@apollo/client';
import { GET_ORG_MEMBERS, GET_ORG_USAGE } from '../graphql/queries';

const OrgContext = createContext<any>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.defaultRole) {
      setOrgId('mock-org-id');
    }
  }, [user]);

  const { data: membersData } = useQuery(GET_ORG_MEMBERS, { skip: !orgId, variables: { org_id: orgId } });
  const { data: usageData } = useQuery(GET_ORG_USAGE, { skip: !orgId, variables: { org_id: orgId } });

  return (
    <OrgContext.Provider value={{ orgId, members: membersData?.org_members, usage: usageData?.orgs_by_pk }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
""",
"src/app/(auth)/login/page.tsx": """
'use client';
import { useState } from 'react';
import { nhost } from '../../../lib/nhost';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { session, error } = await nhost.auth.signIn({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--bg), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <h1 style={{ fontSize: '3rem', color: '#fff' }}>AI Agent Builder</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Automate your workflows seamlessly.</p>
        </motion.div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div className="glass" style={{ width: '400px', padding: '2rem' }}>
          <h2>Login</h2>
          {error && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="btn-primary">Sign In</button>
          </form>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link href="/signup" style={{ color: 'var(--secondary)' }}>Need an account? Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
""",
"src/app/(auth)/signup/page.tsx": """
'use client';
import { useState } from 'react';
import { nhost } from '../../../lib/nhost';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { session, error } = await nhost.auth.signUp({ email, password, options: { displayName: name } });
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass" style={{ width: '400px', padding: '2rem' }}>
        <h2>Sign Up</h2>
        {error && <div style={{ color: 'var(--error)' }}>{error}</div>}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary">Create Account</button>
        </form>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link href="/login" style={{ color: 'var(--secondary)' }}>Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
}
""",
"src/app/(app)/layout.tsx": """
'use client';
import { useAuth, AuthProvider } from '../../contexts/AuthContext';
import { OrgProvider } from '../../contexts/OrgContext';
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
""",
"src/components/ui/Navbar.tsx": """
export default function Navbar() {
  return (
    <div style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 2rem', background: 'var(--surface)' }}>
      <div style={{ flex: 1 }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)' }} />
      </div>
    </div>
  );
}
""",
"src/app/(app)/dashboard/page.tsx": """
'use client';
import { useOrg } from '../../../contexts/OrgContext';
import QuotaBar from '../../../components/ui/QuotaBar';
import Link from 'next/link';

export default function Dashboard() {
  const { usage } = useOrg();

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Usage Quota</h3>
          <QuotaBar used={usage?.quota_used || 0} limit={usage?.quota_limit || 1000} />
        </div>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Active Workflows</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>5</div>
        </div>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--muted)', marginBottom: '1rem' }}>Runs Today</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>124</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Recent Runs</h2>
        <Link href="/workflows/new" className="btn-primary">Create Workflow</Link>
      </div>
      
      <div className="glass">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem' }}>Workflow</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '1rem' }}>Data Sync</td>
              <td style={{ padding: '1rem' }}><span className="badge badge-completed">Completed</span></td>
              <td style={{ padding: '1rem' }}>2 mins ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
""",
"src/components/ui/QuotaBar.tsx": """
'use client';
import { motion } from 'framer-motion';

export default function QuotaBar({ used, limit }: { used: number, limit: number }) {
  const percent = Math.min((used / limit) * 100, 100) || 0;
  const color = percent > 90 ? 'var(--error)' : percent > 75 ? 'var(--warning)' : 'var(--success)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
        <span>{used} calls</span>
        <span>{limit} limit</span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '4px' }}
        />
      </div>
    </div>
  );
}
""",
"src/app/(app)/workflows/page.tsx": """
'use client';
import Link from 'next/link';

export default function Workflows() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Workflows</h1>
        <Link href="/workflows/new" className="btn-primary">Create Workflow</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3>Sample Workflow</h3>
          <p style={{ color: 'var(--muted)', margin: '1rem 0' }}>Description goes here</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-completed">Last run: Success</span>
            <Link href="/workflows/1" className="btn-secondary">Edit</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
""",
"src/app/(app)/workflows/new/page.tsx": """
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewWorkflow() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const router = useRouter();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/workflows/new-id');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>Create Workflow</h1>
      <form onSubmit={handleCreate} className="glass" style={{ padding: '2rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
        </div>
        <button type="submit" className="btn-primary">Create</button>
      </form>
    </div>
  );
}
""",
"src/app/(app)/workflows/[id]/page.tsx": """
'use client';
import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import StepCard from '../../../../components/workflow/StepCard';

export default function WorkflowBuilder({ params }: { params: { id: string } }) {
  const [steps, setSteps] = useState([
    { id: '1', type: 'llm_call', name: 'Generate Text' },
    { id: '2', type: 'http_request', name: 'Fetch Data' }
  ]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '1rem' }}>
      <div className="glass" style={{ width: '250px', padding: '1rem' }}>
        <h3>Step Palette</h3>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="btn-ghost" style={{ padding: '0.5rem', textAlign: 'center' }}>LLM Call</div>
          <div className="btn-ghost" style={{ padding: '0.5rem', textAlign: 'center' }}>HTTP Request</div>
          <div className="btn-ghost" style={{ padding: '0.5rem', textAlign: 'center' }}>DB Write</div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Workflow Builder</h2>
          <div>
            <button className="btn-ghost" style={{ marginRight: '0.5rem' }}>Save</button>
            <button className="btn-primary">Run Workflow</button>
          </div>
        </div>
        
        <div className="glass" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps} strategy={verticalListSortingStrategy}>
              {steps.map(step => <StepCard key={step.id} step={step} />)}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="glass" style={{ width: '300px', padding: '1rem' }}>
        <h3>Trigger</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '1rem' }}>Configure how this workflow starts.</p>
        <select style={{ marginTop: '1rem' }}>
          <option value="manual">Manual</option>
          <option value="webhook">Webhook</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>
    </div>
  );
}
""",
"src/components/workflow/StepCard.tsx": """
'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export default function StepCard({ step }: { step: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
      <div {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: '1rem', color: 'var(--muted)' }}>
        <GripVertical size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold' }}>{step.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{step.type}</div>
      </div>
      <button className="btn-ghost" style={{ padding: '0.5rem', color: 'var(--error)' }}>
        <Trash2 size={18} />
      </button>
    </div>
  );
}
""",
"src/components/workflow/StepConfigModal.tsx": """
'use client';
export default function StepConfigModal() { return null; }
""",
"src/components/workflow/TriggerConfig.tsx": """
'use client';
export default function TriggerConfig() { return null; }
""",
"src/app/(app)/workflows/[id]/runs/[runId]/page.tsx": """
'use client';
export default function RunView() { return <div>Live Run View</div>; }
""",
"src/app/(app)/settings/page.tsx": """
'use client';
export default function Settings() { return <div>Settings</div>; }
""",
"src/components/run/StepRunCard.tsx": """
'use client';
export default function StepRunCard() { return null; }
""",
"src/components/run/ApproveButton.tsx": """
'use client';
export default function ApproveButton() { return null; }
"""
}

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content.strip())
