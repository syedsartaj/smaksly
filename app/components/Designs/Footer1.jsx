import Link from 'next/link';

export default function Footerone() {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {/* Logo */}
        <Link href="#" className="text-2xl font-bold mb-4 md:mb-0">
          company name
        </Link>

        {/* Navigation Links */}
        <nav className="flex space-x-6">
          <Link href="#" className="hover:text-blue-400">
            About
          </Link>
          <Link href="#" className="hover:text-blue-400">
            Services
          </Link>
          <Link href="#" className="hover:text-blue-400">
            Contact
          </Link>
        </nav>

        {/* Copyright */}
        <p className="mt-4 md:mt-0 text-sm">
          &copy; {new Date().getFullYear()} MarketVibe. All rights reserved.
        </p>
      </div>
    </footer>
  );
}