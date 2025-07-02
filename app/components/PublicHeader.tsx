'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Customers', href: '/' },
  { label: 'About Us', href: '/' },
  { label: 'Insights', href: '/' },
  { label: 'Resources', href: '/' },
];

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="text-2xl font-extrabold tracking-wide">SMAKSLY</div>

        {/* Navigation */}
        <nav className="space-x-10 hidden md:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="relative font-semibold text-black hover:text-black transition"
            >
              {item.label}
              <span className="absolute left-0 -bottom-1 h-[2px] w-full bg-black scale-x-0 hover:scale-x-100 origin-left transition-transform duration-200" />
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <Link
          href="#book"
          className="bg-black text-white font-semibold px-4 py-2 rounded-md hover:opacity-90 transition"
        >
          Book a 15 min Call
        </Link>
      </div>
    </header>
  );
}
