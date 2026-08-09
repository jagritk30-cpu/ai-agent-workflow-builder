'use client';

import { useState } from 'react';
import { useSignInEmailPassword } from '@nhost/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cpu, CheckCircle2, Zap, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signInEmailPassword, isLoading, isError, error } = useSignInEmailPassword();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { isSuccess } = await signInEmailPassword(email, password);
    if (isSuccess) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0f] text-[#e8eaf6]">
      {/* Left Panel */}
      <div className="md:w-1/2 relative overflow-hidden flex flex-col justify-center p-12 bg-[#12121a] border-r border-[#2a2a35]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6c63ff]/20 to-[#00d4ff]/20 opacity-50"></div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Cpu className="w-10 h-10 text-[#6c63ff]" />
            <h1 className="text-3xl font-bold tracking-tight">AgentFlow</h1>
          </div>
          <h2 className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#6c63ff] to-[#00d4ff]">
            Build AI Workflows That Actually Work
          </h2>
          <ul className="space-y-6 mt-12">
            <li className="flex items-start gap-4">
              <div className="p-2 bg-[#6c63ff]/10 rounded-lg text-[#6c63ff]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Lightning Fast</h3>
                <p className="text-gray-400">Deploy agents in seconds with our optimized execution engine.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="p-2 bg-[#00e676]/10 rounded-lg text-[#00e676]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Enterprise Secure</h3>
                <p className="text-gray-400">Your data never leaves your private isolated environment.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="p-2 bg-[#00d4ff]/10 rounded-lg text-[#00d4ff]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Guaranteed Reliability</h3>
                <p className="text-gray-400">Built-in fallbacks and human-in-the-loop approvals.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md glass p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
            <p className="text-gray-400">Sign in to your organization</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="label-text" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="label-text" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isError && (
              <div className="p-3 bg-[#ff5252]/10 border border-[#ff5252]/30 rounded-lg flex items-center gap-2 text-[#ff5252] animate-in fade-in slide-in-from-top-2">
                <span className="text-sm">{error?.message || 'Login failed. Please check your credentials.'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center py-3"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#6c63ff] hover:text-[#00d4ff] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
