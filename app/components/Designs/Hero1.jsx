import Link from 'next/link';

export default function HeroBanner() {
  return (
    <section className="relative w-full h-screen bg-cover bg-center" style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }}>
      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">heading</h1>
          <p className="text-lg md:text-xl mb-6">subheading</p>
          <Link href="#" className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition text-lg">
            buttonText
          </Link>
        </div>
      </div>
    </section>
  );
}