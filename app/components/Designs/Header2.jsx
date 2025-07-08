import Link from 'next/link';
import { useState } from 'react';

export default function Header2() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="#" className="text-2xl font-bold">
          compname
        </Link>

        {/* Hamburger Button */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>

        {/* Navigation Links */}
        <nav className={`md:flex ${isOpen ? 'block' : 'hidden'} absolute md:static top-16 left-0 w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 md:bg-transparent flex-col md:flex-row md:space-x-6 p-4 md:p-0`}>
          <Link href="#" className="py-2 md:py-0 hover:text-gray-200">
            Services
          </Link>
          <Link href="#" className="py-2 md:py-0 hover:text-gray-200">
            About
          </Link>
          <Link href="#" className="py-2 md:py-0 hover:text-gray-200">
            Blog
          </Link>
          <Link href="#" className="py-2 md:py-0 hover:text-gray-200">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}