'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OrgContext = createContext<any>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.defaultRole) {
      setOrgId('mock-org-id');
    }
  }, [user]);

  return (
    <OrgContext.Provider value={{ orgId, members: [], usage: { quota_used: 150, quota_limit: 1000 } }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
