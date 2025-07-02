'use client';

import { useState } from 'react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // Basic email and password validation
  const validateEmail = (email:any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password:any) =>
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const handleSignup = async () => {
    if (!validateEmail(email)) {
      setMessage('❌ Please enter a valid email address');
      return;
    }
    if (!validatePassword(password)) {
      setMessage('❌ Password must be at least 6 characters, include an uppercase letter, a number, and a special character');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Signup successful! Redirecting to login...');
        setTimeout(() => (window.location.href = '/login'), 1500); // Redirect to login
      } else {
        setMessage(`❌ ${data.error || 'Signup failed. Please try again.'}`);
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
          <img src="/xai-logo.png" alt="xAI Logo" className="mx-auto h-12 mb-2" />
          <h1 className="text-3xl font-bold">Join Smaksly</h1>
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
                placeholder="Create a password"
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
            <p className="text-gray-400 text-sm mt-1">
              Password must be at least 6 characters, include an uppercase letter, a number, and a special character.
            </p>
          </div>
          <button
            onClick={handleSignup}
            disabled={isLoading}
            className="bg-green-600 text-white p-2 w-full rounded hover:bg-green-700 disabled:bg-green-400 transition"
          >
            {isLoading ? 'Signing Up...' : 'Sign Up'}
          </button>
          <div className="text-center text-sm">
            <a href="/login" className="text-blue-400 hover:underline">
              Already have an account? Log in
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