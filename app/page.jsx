'use client';

import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import PublicHeader from './components/PublicHeader';
import { useRouter } from 'next/navigation';

export default function PublicHomePage() {
    const router = useRouter();

  return (
    <>
    <PublicHeader/>
    <main className="bg-white text-black">
      {/* Hero Section */}
      <section className="bg-[#FDF9F6] py-20 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Scale your company with Smaksly</h1>
        <p className="text-lg max-w-2xl mx-auto mb-6">
          Easily deploy websites, automate tasks, and manage infrastructure without the hassle.
        </p>
        <div className="flex justify-center gap-4">
          <Button 
          className="bg-black text-white px-6 py-3 rounded"
          onClick={() => router.push('/login')}
          >
            Get Started</Button>
          <Button 
          variant="outline" 
          className="px-6 py-3 rounded"
          onClick={() => router.push('/login')}
          >
            Explore</Button>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="py-12 px-6 text-center bg-white">
        <p className="text-sm uppercase text-gray-500">Trusted by teams at</p>
        <div className="flex justify-center flex-wrap gap-6 mt-4">
          {/* You can replace these with Image components or company logos */}
          <span className="text-xl font-semibold">Vercel</span>
          <span className="text-xl font-semibold">Firebase</span>
          <span className="text-xl font-semibold">MongoDB</span>
          <span className="text-xl font-semibold">Stripe</span>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black text-white py-20 px-6 grid grid-cols-1 md:grid-cols-3 text-center">
        <div>
          <h2 className="text-3xl font-bold">200+</h2>
          <p>Projects Deployed</p>
        </div>
        <div>
          <h2 className="text-3xl font-bold">50+</h2>
          <p>Active Clients</p>
        </div>
        <div>
          <h2 className="text-3xl font-bold">99.9%</h2>
          <p>Uptime</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#FDF9F6] py-20 px-6 text-center">
        <h2 className="text-2xl font-bold mb-10">What our customers say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded shadow-md">
            <p className="italic">"Smaksly is a game changer for web automation and deployment."</p>
            <p className="mt-4 font-semibold">- John Doe</p>
          </div>
          <div className="bg-white p-6 rounded shadow-md">
            <p className="italic">"Fast, reliable, and super easy to use."</p>
            <p className="mt-4 font-semibold">- Jane Smith</p>
          </div>
          <div className="bg-white p-6 rounded shadow-md">
            <p className="italic">"Our startup scaled faster thanks to Smaksly."</p>
            <p className="mt-4 font-semibold">- Ali Khan</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#6C63FF] text-white py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">The right partner makes the right difference</h2>
        <p className="text-lg max-w-xl mx-auto mb-6">Let Smaksly handle your backend, deployment, and automation.</p>
        <Button className="bg-white text-black px-6 py-3 rounded">Schedule a Demo</Button>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-10 px-6 text-center">
        <p className="mb-2">Smaksly © {new Date().getFullYear()} All rights reserved.</p>
        <p className="text-sm">Built with ❤️ by Sartaj and Team</p>
      </footer>
    </main>
    </>
  );
}
