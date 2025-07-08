import Link from 'next/link';

export default function Herosectiontwo() {
  return (
    <section className="relative w-full h-screen overflow-hidden">
      <video
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
        src="/videos/marketing-video.mp4"
      />
      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">heading</h1>
          <p className="text-lg md:text-xl mb-6">subheading</p>
          <Link href="#" className="bg-purple-600 text-white px-8 py-3 rounded-full hover:bg-purple-700 transition text-lg">
            buttonText
          </Link>
        </div>
      </div>
    </section>
  );
}