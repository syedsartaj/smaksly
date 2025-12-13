'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const toggleSidebar = () => setIsOpen(!isOpen);

  // Define which routes are coming soon
  const comingSoon = ['/projects', '/analytics', '/domain', '/integrations', '/settings','/collaboration'];

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/portfolio', label: 'My Portfolio', icon: '🧑‍💻' },
    { href: '/themes', label: 'Themes', icon: '🎨' },
    { href: '/collaboration', label: 'Collaboration', icon: '🤝' },
    { href: '/projects', label: 'Projects', icon: '📁' },
    { href: '/analytics', label: 'Analytics', icon: '📊' },
    { href: '/domain', label: 'Domain', icon: '🌐' },
    { href: '/integrations', label: 'Integrations', icon: '🔗' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <motion.aside
      initial={{ width: 0 }}
      animate={{ width: isOpen ? 240 : 72 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-gradient-to-b from-[#0D0D0D] to-[#1A1A1A] h-screen p-4 text-sm border-r border-[#2f2f2f] shadow-[0_2px_4px_rgba(0,0,0,0.4)] flex flex-col"
    >
      {/* Header + Toggle */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-2">
          <svg
            className="w-6 h-6 text-[#00BFA5]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
          </svg>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-white text-lg tracking-wide"
                style={{ fontFamily: 'Josefin Sans, sans-serif' }}
              >
                Smaksly
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={toggleSidebar}
          className="text-[#B0B0B0] hover:text-white focus:outline-none p-1 rounded"
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

      {/* Navigation */}
      <motion.ul layout className="space-y-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isComingSoon = comingSoon.includes(item.href);

          const baseClasses =
            'flex items-center px-3 py-2 rounded-md transition-all duration-200';
          const activeClasses =
            'bg-[#1E1E1E] text-[#00BFA5] shadow-[0_0_10px_#00BFA566]';
          const inactiveClasses =
            'text-[#E4E4E7] hover:bg-[#1E1E1E] hover:shadow-[0_0_10px_#00BFA544] hover:text-white';
          const disabledClasses =
            'opacity-60 cursor-not-allowed text-[#999] bg-transparent hover:bg-transparent hover:shadow-none';

          return (
            <motion.li key={item.href} whileHover={!isComingSoon ? { scale: 1.03 } : {}}>
              {!isComingSoon ? (
                <Link
                  href={item.href}
                  className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="font-medium"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              ) : (
                <div
                  className={`${baseClasses} ${disabledClasses}`}
                  title="Launching soon 🚀"
                >
                  <span className="text-lg mr-3">{item.icon}</span>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between w-full"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-[10px] text-[#00BFA5] ml-2 border border-[#00BFA5] px-1 rounded">
                          🚀 Soon
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.li>
          );
        })}
      </motion.ul>

      {/* Logout */}
      <div className="mt-auto pt-8 border-t border-[#2a2a2a]">
        <motion.div whileHover={{ scale: 1.03 }}>
          <Link
            href="/logout"
            className="flex items-center px-3 py-2 rounded-md text-[#E4E4E7] hover:bg-[#1E1E1E] hover:text-red-400 transition-all"
          >
            <span className="mr-3 text-lg">🚪</span>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>
      </div>
    </motion.aside>
  );
}
