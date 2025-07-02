'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // Basic email validation
  const validateEmail = (email:any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async () => {
    if (!validateEmail(email)) {
      setMessage('❌ Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setMessage('❌ Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Logged in successfully');
        localStorage.setItem('userEmail', email); // Consider replacing with secure token storage
        setTimeout(() => (window.location.href = '/dashboard'), 1000); // Redirect to dashboard
      } else {
        setMessage(`❌ ${data.error || 'Login failed. Please try again.'}`);
      }
    } catch (error) {
      setMessage('❌ Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Detect Caps Lock
  const handleKeyDown = (e:any) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="p-8 max-w-md w-full bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <img src="/xai-logo.png" alt="Smaksly Logo" className="mx-auto h-12 mb-2" />
          <h1 className="text-3xl font-bold">Welcome to Smaksly</h1>
          <p className="text-gray-400">Free to Build. Power to Scale</p>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="border border-gray-600 p-2 w-full rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="border border-gray-600 p-2 w-full rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-400 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {isCapsLockOn && (
              <p className="text-yellow-400 text-sm mt-1">Caps Lock is on</p>
            )}
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="bg-blue-600 text-white p-2 w-full rounded hover:bg-blue-700 disabled:bg-blue-400 transition"
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
          <div className="flex justify-between text-sm">
            <a href="/forgot-password" className="text-blue-400 hover:underline">
              Forgot Password?
            </a>
            <a href="/signup" className="text-blue-400 hover:underline">
              Don’t have an account? Sign up
            </a>
          </div>
       </div>
        {message && (
          <p className={`mt-4 text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}