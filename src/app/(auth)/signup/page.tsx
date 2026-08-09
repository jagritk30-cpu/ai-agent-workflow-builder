'use client';

import { useState } from 'react';
import { useSignUpEmailPassword } from '@nhost/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cpu, CheckCircle2, Zap, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const { signUpEmailPassword, isLoading, isError, error } = useSignUpEmailPassword();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    const { isSuccess } = await signUpEmailPassword(email, password, {
      displayName: name,
      metadata: { orgName }
    });

    if (isSuccess) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0a0a0f] text-[#e8eaf6]">
      {/* Left Panel */}
      <div className="md:w-1/2 relative overflow-hidden flex flex-col justify-center p-12 bg-[#12121a] border-r border-[#2a2a35] hidden md:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6c63ff]/20 to-[#00d4ff]/20 opacity-50"></div>
        <div className="relative z-10 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Cpu className="w-10 h-10 text-[#6c63ff]" />
            <h1 className="text-3xl font-bold tracking-tight">AgentFlow</h1>
          </div>
          <h2 className="text-4xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#6c63ff] to-[#00d4ff]">
            Start Building Autonomous Agents Today
          </h2>
          <ul className="space-y-6 mt-12">
            <li className="flex items-start gap-4">
              <div className="p-2 bg-[#6c63ff]/10 rounded-lg text-[#6c63ff]">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Visual Builder</h3>
                <p className="text-gray-400">Drag and drop nodes to create complex AI workflows without code.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="p-2 bg-[#00e676]/10 rounded-lg text-[#00e676]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Team Collaboration</h3>
                <p className="text-gray-400">Work together with your organization in real-time.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 py-12">
        <div className="w-full max-w-md glass p-8 rounded-2xl h-full md:h-auto overflow-y-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Create your account</h2>
            <p className="text-gray-400">Get started with your free trial</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input w-full"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input w-full"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="orgName">Organization Name</label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="form-input w-full"
                placeholder="Acme Corp"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input w-full pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input w-full"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {(isError || validationError) && (
              <div className="p-3 mt-4 bg-[#ff5252]/10 border border-[#ff5252]/30 rounded-lg flex items-center gap-2 text-[#ff5252] animate-in fade-in slide-in-from-top-2">
                <span className="text-sm">{validationError || error?.message || 'Failed to create account.'}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center py-3 mt-6"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#6c63ff] hover:text-[#00d4ff] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
