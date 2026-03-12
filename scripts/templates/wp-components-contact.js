function generateContactPage(site) {
  return `'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-${site.tw}-50 via-white to-${site.tw}-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question, suggestion, or want to collaborate? We&apos;d love to hear from you.
            Reach out and our ${site.niche.toLowerCase()} team will get back to you shortly.
          </p>
          <div className="mt-6 w-20 h-1 bg-${site.tw}-500 mx-auto rounded-full" />
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-10">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                Send Us a Message
              </h2>
              <p className="text-gray-500 mb-8">
                Fill out the form below and we&apos;ll respond within 24 hours.
              </p>

              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  Thank you for your message! We&apos;ll get back to you soon.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent transition"
                  >
                    <option value="">Select a subject...</option>
                    <option value="general">General Inquiry</option>
                    <option value="feedback">Feedback</option>
                    <option value="collaboration">Collaboration</option>
                    <option value="advertising">Advertising</option>
                    <option value="support">Support</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    placeholder="Tell us what's on your mind..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full md:w-auto px-8 py-3.5 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-${site.tw}-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-${site.tw}-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                  <p className="text-gray-600 text-sm mb-2">We typically reply within 24 hours</p>
                  <a href="mailto:hello@${site.name.toLowerCase().replace(/\\s+/g, '')}.com" className="text-${site.tw}-600 hover:text-${site.tw}-700 font-medium text-sm">
                    hello@${site.name.toLowerCase().replace(/\\s+/g, '')}.com
                  </a>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-${site.tw}-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-${site.tw}-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Our Office</h3>
                  <p className="text-gray-600 text-sm">
                    123 ${site.niche} Avenue<br />
                    Suite 400, San Francisco<br />
                    CA 94102, United States
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-${site.tw}-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-${site.tw}-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                  <p className="text-gray-600 text-sm mb-2">Mon-Fri, 9AM - 6PM PST</p>
                  <a href="tel:+14155551234" className="text-${site.tw}-600 hover:text-${site.tw}-700 font-medium text-sm">
                    +1 (415) 555-1234
                  </a>
                </div>
              </div>
            </div>

            {/* Follow Us */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
              <div className="flex gap-3">
                {[
                  { label: 'Twitter', path: 'M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' },
                  { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 2h11A4.5 4.5 0 0122 6.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2z' },
                  { label: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    aria-label={social.label}
                    className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:text-${site.tw}-600 hover:border-${site.tw}-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / CTA Section */}
      <section className="bg-gray-50 border-t border-gray-100 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 mb-10">
            Can&apos;t find what you&apos;re looking for? Send us a message above.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {[
              { q: 'How can I contribute an article?', a: 'We welcome guest contributions! Send us a pitch via the contact form with your topic idea and writing samples.' },
              { q: 'Do you offer advertising?', a: 'Yes, we offer various advertising and sponsorship packages. Select "Advertising" in the subject dropdown for details.' },
              { q: 'How often do you publish?', a: 'We publish new ${site.niche.toLowerCase()} content daily, with in-depth features every week.' },
              { q: 'Can I republish your content?', a: 'Content syndication is available on a case-by-case basis. Please reach out to discuss licensing.' },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
`;
}

function generateHeaderComponent(site) {
  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return `'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navLinks = ${JSON.stringify(navLinks, null, 2)};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo / Site Name */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-${site.tw}-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">${site.name.charAt(0)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl text-gray-900 group-hover:text-${site.tw}-600 transition-colors leading-tight">
                ${site.name}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 hidden sm:block leading-tight">
                ${site.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={\`px-4 py-2 rounded-lg text-sm font-medium transition-colors \${
                    isActive
                      ? 'text-${site.tw}-600 bg-${site.tw}-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }\`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="ml-2 pl-3 border-l border-gray-200">
              <Link
                href="/blog"
                className="px-4 py-2 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Subscribe
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <nav className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={\`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                    isActive
                      ? 'text-${site.tw}-600 bg-${site.tw}-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }\`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2">
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center px-4 py-2.5 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Subscribe
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
`;
}

function generateFooterComponent(site) {
  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const topicLinks = site.topics.map((t) => ({
    label: t,
    href: `/blog/category/${t.toLowerCase().replace(/\s+/g, '-')}`,
  }));

  return `import Link from 'next/link';

const quickLinks = ${JSON.stringify(quickLinks, null, 2)};

const categoryLinks = ${JSON.stringify(topicLinks, null, 2)};

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1: About */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group mb-4">
              <div className="w-9 h-9 bg-${site.tw}-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">${site.name.charAt(0)}</span>
              </div>
              <span className="font-serif font-bold text-xl text-white">
                ${site.name}
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              ${site.description}. We bring you the latest insights, analysis, and stories from the world of ${site.niche.toLowerCase()}.
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Twitter', path: 'M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84' },
                { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 2h11A4.5 4.5 0 0122 6.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2z' },
                { label: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 2a2 2 0 110 4 2 2 0 010-4z' },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 bg-gray-800 hover:bg-${site.tw}-600 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-${site.tw}-400 text-sm transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Categories
            </h3>
            <ul className="space-y-3">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-${site.tw}-400 text-sm transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Newsletter
            </h3>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Subscribe to get the latest ${site.niche.toLowerCase()} news delivered straight to your inbox every week.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Subscribe
              </button>
            </form>
            <p className="text-gray-500 text-xs mt-3">
              No spam, ever. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} ${site.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Terms of Service
              </Link>
              <Link href="/sitemap.xml" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
`;
}

module.exports = { generateContactPage, generateHeaderComponent, generateFooterComponent };
