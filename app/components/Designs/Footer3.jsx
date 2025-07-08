import Link from 'next/link';

export default function Footerthree() {
  return (
    <footer className="bg-gray-100 text-gray-800 py-10">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {/* Logo */}
        <div className="mb-6 md:mb-0">
          <Link href="#" className="text-3xl font-extrabold text-blue-600">
            companyName
          </Link>
          <p className="text-sm mt-2">companySlogan</p>
        </div>

        {/* CTA */}
        <Link href="#" className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition mb-6 md:mb-0">
          Get a Free Quote
        </Link>

        {/* Navigation */}
        <nav className="flex space-x-6">
          <Link href="#" className="hover:text-blue-600">
            Privacy Policy
          </Link>
          <Link href="/#" className="hover:text-blue-600">
            Terms of Service
          </Link>
        </nav>
      </div>
      <div className="container mx-auto px-4 pt-6 text-center text-sm">
        &copy; {new Date().getFullYear()} BrandBoost. All rights reserved.
      </div>
    </footer>
  );
}