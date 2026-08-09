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
