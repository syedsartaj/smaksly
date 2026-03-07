'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PublicHomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-black text-lg">
                S
              </div>
              <span className="text-xl font-bold text-white">Smaksly</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-8 text-sm items-center">
              <Link href="/" className="text-white font-medium">Home</Link>
              <Link href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</Link>
              <Link href="#services" className="text-zinc-400 hover:text-white transition-colors">Services</Link>
              <Link href="#testimonials" className="text-zinc-400 hover:text-white transition-colors">Testimonials</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden sm:flex items-center px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md text-sm font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="inline-flex items-center bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold px-5 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/20 text-sm">
                Get Started
              </Link>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden text-white p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-white/10">
              <div className="flex flex-col gap-3">
                <Link href="/" className="text-white font-medium px-2 py-2">Home</Link>
                <Link href="#features" className="text-zinc-400 hover:text-white px-2 py-2">Features</Link>
                <Link href="#services" className="text-zinc-400 hover:text-white px-2 py-2">Services</Link>
                <Link href="#testimonials" className="text-zinc-400 hover:text-white px-2 py-2">Testimonials</Link>
                <Link href="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold mt-2 px-4 py-2 rounded-md text-sm">
                  Get Started
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-300">Manage 100+ Websites with One Dashboard</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="text-white">Build Websites that</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Convert & Scale
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              AI-powered content generation, one-click deployments, and centralized analytics.
              We handle the technical layer so you can focus on growing your business.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold px-8 py-4 text-lg rounded-xl shadow-xl shadow-emerald-500/25 transition-all duration-200 hover:scale-105">
                Start Free Trial
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center border border-zinc-700 text-white hover:bg-white/5 px-8 py-4 text-lg rounded-xl transition-all duration-200">
                Watch Demo
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { value: '500+', label: 'Websites Managed' },
                { value: '99.9%', label: 'Uptime' },
                { value: '50k+', label: 'Articles Generated' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Everything You Need to Scale
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Powerful tools designed to help digital agencies manage hundreds of websites effortlessly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: '🤖', title: 'AI Content Generation', desc: 'Generate SEO-optimized articles instantly with GPT-4 integration', gradient: 'from-violet-500/20 to-purple-500/20' },
                { icon: '📊', title: 'Unified Analytics', desc: 'Track all your websites from a single, intuitive dashboard', gradient: 'from-emerald-500/20 to-cyan-500/20' },
                { icon: '🚀', title: 'One-Click Deploy', desc: 'Deploy to Vercel with automatic GitHub sync in seconds', gradient: 'from-orange-500/20 to-amber-500/20' },
                { icon: '🎨', title: 'Premium Themes', desc: '10+ professional templates ready to customize and launch', gradient: 'from-pink-500/20 to-rose-500/20' },
                { icon: '🔒', title: 'Enterprise Security', desc: 'SSL, malware protection, and automated daily backups', gradient: 'from-blue-500/20 to-indigo-500/20' },
                { icon: '⚡', title: 'Lightning Fast', desc: 'Edge-optimized performance with global CDN delivery', gradient: 'from-yellow-500/20 to-amber-500/20' },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300`} />
                  <div className="relative">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Complete Site Care Solutions
              </h2>
              <p className="text-zinc-400 max-w-xl mx-auto">
                From analytics to AI content optimization, we have got everything covered.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { title: 'Free Audit', icon: '🔍' },
                { title: 'AI Writer', icon: '✨' },
                { title: 'Auto Index', icon: '📈' },
                { title: 'Security', icon: '🛡️' },
                { title: 'UI/UX', icon: '🎨' },
                { title: 'Maintenance', icon: '🔧' },
              ].map((service, idx) => (
                <div
                  key={idx}
                  className="group bg-zinc-900 border border-zinc-800 p-5 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 cursor-pointer text-center"
                >
                  <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform duration-300">
                    {service.icon}
                  </span>
                  <h3 className="font-medium text-white text-sm">{service.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
              Trusted by <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Digital Agencies</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { quote: "Smaksly transformed how we manage client websites. The AI content tools are incredible.", author: 'Sophia M.', role: 'Agency Owner', avatar: 'S' },
                { quote: "Managing 50+ websites from one dashboard has saved us countless hours every week.", author: 'Ramesh G.', role: 'Marketing Director', avatar: 'R' },
                { quote: "We cut our manual work by 80%. The automation features are genuinely game-changing.", author: 'Laura W.', role: 'SEO Consultant', avatar: 'L' },
              ].map((testimonial, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-zinc-700 transition-all duration-300"
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-zinc-300 mb-6 leading-relaxed">&quot;{testimonial.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center text-black font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-zinc-500 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-3xl p-8 sm:p-12 text-center overflow-hidden">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to Scale Your Business?
                </h2>
                <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                  Join thousands of agencies managing their client websites with Smaksly. Start your free trial today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup" className="inline-flex items-center justify-center bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-semibold px-8 py-4 text-lg rounded-xl shadow-xl shadow-emerald-500/25 transition-all duration-200 hover:scale-105">
                    Get Started Free
                  </Link>
                  <Link href="/login" className="inline-flex items-center justify-center border border-zinc-700 text-white hover:bg-white/5 px-8 py-4 text-lg rounded-xl transition-all duration-200">
                    Schedule Demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-zinc-950 border-t border-zinc-800 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-black text-lg">
                    S
                  </div>
                  <span className="text-xl font-bold text-white">Smaksly</span>
                </div>
                <p className="text-zinc-500 text-sm">
                  The all-in-one platform for digital agencies.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Pricing</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">API</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link href="/login" className="hover:text-white transition-colors">About</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Blog</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Careers</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li><Link href="/login" className="hover:text-white transition-colors">Privacy</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Terms</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Security</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} Smaksly. All rights reserved.
              </p>
              <p className="text-zinc-600 text-sm">
                Crafted with care by Sartaj and Team
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
