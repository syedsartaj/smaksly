'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <aside
      className={`bg-gradient-to-b from-[#1A1B1E] to-[#141517] h-screen p-4 text-sm transition-all duration-300 ${
        isOpen ? 'w-56' : 'w-16'
      }`}
      aria-label="Sidebar navigation"
    >
      <div className="flex justify-between items-center mb-6">
        {isOpen ? (
          <div className="flex items-center space-x-2">
            {/* xAI-inspired logo icon */}
            <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
            </svg>
            <span className="font-bold text-white text-lg" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
              Smaksly
            </span>
          </div>
        ) : (
          <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
            </svg>
        )}
        <button
          onClick={toggleSidebar}
          className="text-[#E4E4E7] hover:text-white focus:outline-none p-1 rounded"
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>
      </div>
      <ul className="space-y-4">
        <li>
          <Link
            href="/dashboard"
            className={`flex items-center px-2 py-1 rounded ${
              pathname === '/dashboard'
                ? 'bg-[#403f3f] text-white'
                : 'text-[#E4E4E7] hover:bg-[#2A2B2D] hover:text-white'
            }`}
            aria-label="Deployments"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {/* Server/dashboard icon inspired by Grok’s futuristic style */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            {isOpen && 'Deployments'}
          </Link>
        </li>
        <li>
          <Link
            href="/deploy"
            className={`flex items-center px-2 py-1 rounded ${
              pathname === '/deploy'
                ? 'bg-[#403f3f] text-white'
                : 'text-[#E4E4E7] hover:bg-[#2A2B2D] hover:text-white'
            }`}
            aria-label="Deploy New Website"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {/* Rocket/launch icon to match Grok’s space theme */}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            {isOpen && 'Deploy New Website'}
          </Link>
        </li>
      </ul>
    </aside>
  );
}