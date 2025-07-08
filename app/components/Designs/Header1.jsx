"use client";
import Link from 'next/link';
 const Header1 = () => {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="#" className="text-2xl font-bold text-blue-600">
          company name
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex space-x-6">
          <Link href="#" className="text-gray-600 hover:text-blue-600">
            Services
          </Link>
          <Link href="#" className="text-gray-600 hover:text-blue-600">
            About
          </Link>
          <Link href="#" className="text-gray-600 hover:text-blue-600">
            Blog
          </Link>
          <Link href="#" className="text-gray-600 hover:text-blue-600">
            Contact
          </Link>
        </nav>

        {/* CTA Button */}
        <Link
          href="#"
          className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}

export default Header1;