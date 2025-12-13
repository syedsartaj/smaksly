'use client';

import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import PublicHeader from './components/PublicHeader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

export default function PublicHomePage() {
  const router = useRouter();
const [animationData, setAnimationData] = useState(null);

useEffect(() => {
  fetch('/lottie/hero_section_animation.json')
    .then((res) => res.json())
    .then(setAnimationData)
    .catch(console.error);
}, []);

  return (
    <>
      <header className="bg-[#0C0A1F] text-white py-4 px-6 flex justify-between items-center border-b border-[#1C1936]">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="Smaksly Logo" width={200} height={40} />
        </div>
        <nav className="hidden md:flex gap-8 text-sm items-center">
          <Link href="/" className="text-[#9929EA]">Home</Link>
          <div className="relative group">
            <span className="cursor-pointer">Services ▾</span>
            {/* Dropdown logic to be implemented if needed */}
          </div>
          <div className="relative group">
            <span className="cursor-pointer">Blog ▾</span>
          </div>
          <Link href="/about">About</Link>
          <Link href="/write">Write For Us</Link>
          <Link href="/contact">Let&apos;s Talk</Link>
        </nav>
        <div className="text-gray-400 cursor-pointer">
          🔍
        </div>
      </header>
      <main className="bg-[#0C0A1F] text-white">
        {/* HERO SECTION */}
        <section className="py-20 px-6 text-center">
          {/* 🟣 Add the Lottie animation here */}
          <div className="max-w-4xl mx-auto mb-10">
            {animationData && (
              <div className="max-w-4xl mx-auto mb-10">
                <Lottie animationData={animationData} loop />
              </div>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Digital Designs that <span className="text-[#6C63FF]">Captivate</span>,<br />
            <span className="text-[#6C63FF]">Convince</span>, and <span className="text-[#6C63FF]">Convert</span>!
          </h1>
          <p className="text-lg max-w-2xl mx-auto mb-6">
            We handle the technical layer so digital marketing service providers don't have to.
          </p>
          <Button 
            className="bg-[#9929EA] text-white px-6 py-3 rounded"
            onClick={() => router.push('/login')}
          >
            Let’s Talk
          </Button>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6 text-center bg-[#0C0A1F]">
          <h2 className="text-3xl font-semibold mb-4">We Don’t <span className="text-[#6C63FF]">Blurb</span>, We Do It!</h2>
          <p className="max-w-2xl mx-auto mb-6">
            The Smaksly console lets agencies manage hundreds of websites with one login – view analytics, generate and optimize articles, and deploy updates across WordPress and self-hosted platforms.
          </p>
          <Button className="bg-[#9929EA] text-white px-6 py-3 rounded">Get a Demo</Button>
        </section>

        {/* Services Overview */}
        <section className="py-20 px-6 text-center bg-white text-black">
          <h3 className="text-xl font-bold mb-2">Site Care – For Better <span className="text-[#9929EA]">Performance</span> & <span className="text-[#9929EA]">Security</span></h3>
          <p className="max-w-xl mx-auto mb-6">
            From web analytics to automated AI content optimization, we’ve got it covered – freeing your team to scale performance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">Free Website Audit</div>
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">AI Article Generator</div>
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">Auto Indexing Algorithm</div>
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">Malware Removal</div>
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">UI Improvements</div>
            <div className="bg-[#FDF9F6] p-6 rounded shadow-md">Full Site Maintenance</div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-6 text-center bg-[#0C0A1F]">
          <h2 className="text-2xl font-bold mb-10">Client Testimonials</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="bg-[#1C1936] p-6 rounded shadow-md">
              <p className="italic">"Smaksly is the best platform we’ve used to scale client websites and automation."</p>
              <p className="mt-4 font-semibold">- Sophia M., Digital Agency Owner</p>
            </div>
            <div className="bg-[#1C1936] p-6 rounded shadow-md">
              <p className="italic">"We love the AI content tools and easy control of 50+ websites!"</p>
              <p className="mt-4 font-semibold">- Ramesh G., Marketing Director</p>
            </div>
            <div className="bg-[#1C1936] p-6 rounded shadow-md">
              <p className="italic">"Smaksly helped us cut manual work by 80% – highly recommend!"</p>
              <p className="mt-4 font-semibold">- Laura W., SEO Consultant</p>
            </div>
          </div>
        </section>

        {/* Call To Action */}
        <section className="bg-[#6C63FF] text-white py-20 px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Want to have an IMPRESSIVE DIGITAL PRESENCE?</h2>
          <Button className="bg-white text-black px-6 py-3 rounded">Let’s Talk</Button>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-10 px-6 text-center">
          <p className="mb-2">Smaksly © {new Date().getFullYear()} All rights reserved.</p>
          <p className="text-sm">Crafted with ❤️ by Sartaj and Team</p>
        </footer>
      </main>
    </>
  );
}
