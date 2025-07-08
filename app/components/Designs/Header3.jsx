import Link from 'next/link';
import { useState } from 'react';

export default function DropdownHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="#" className="text-2xl font-bold">
          company name
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6 items-center">
          <Link href="#" className="hover:text-gray-300">
            About
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button className="hover:text-gray-300 focus:outline-none">
              Blog
            </button>
            {isDropdownOpen && (
              <div className="absolute top-8 left-0 bg-white text-gray-900 shadow-lg rounded-md p-4 w-48">
                <Link href="#" className="block py-2 hover:text-blue-600">
                  SEO
                </Link>
                <Link href="#" className="block py-2 hover:text-blue-600">
                  PPC
                </Link>
                <Link href="#" className="block py-2 hover:text-blue-600">
                  Social Media
                </Link>
                <Link href="#" className="block py-2 hover:text-blue-600">
                  Content Marketing
                </Link>
              </div>
            )}
          </div>
          <Link href="#" className="hover:text-gray-300">
            Services
          </Link>
          <Link href="#" className="hover:text-gray-300">
            Contact
          </Link>
        </nav>

        {/* CTA Button */}
        <Link
          href="/contactus"
          className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 transition"
        >
          Get a Quote
        </Link>
      </div>
    </header>
  );
}