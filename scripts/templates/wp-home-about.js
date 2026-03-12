/**
 * WordPress-style Home and About page templates.
 * Returns React/TSX component strings with Tailwind CSS styling.
 */

function generateHomePage(site) {
  return `'use client';
import Image from 'next/image';
import Link from 'next/link';

const posts = [
  {
    id: 1,
    title: 'Getting Started with ${site.niche}: A Comprehensive Guide',
    excerpt: 'Everything you need to know to begin your journey into ${site.niche.toLowerCase()}. We cover the basics and give you a solid foundation.',
    category: '${site.topics[0] || 'General'}',
    author: '${site.name} Team',
    date: 'Mar 10, 2026',
    readTime: '8 min read',
  },
  {
    id: 2,
    title: 'Top 10 ${site.topics[1] || site.niche} Trends to Watch in 2026',
    excerpt: 'The landscape is evolving fast. Here are the trends shaping the future of ${site.niche.toLowerCase()} this year.',
    category: '${site.topics[1] || 'Trends'}',
    author: 'Editorial Staff',
    date: 'Mar 8, 2026',
    readTime: '6 min read',
  },
  {
    id: 3,
    title: 'Why ${site.topics[2] || site.niche} Matters More Than Ever',
    excerpt: 'An in-depth look at the growing importance of ${site.topics[2] || site.niche.toLowerCase()} and what it means for professionals.',
    category: '${site.topics[2] || 'Insights'}',
    author: '${site.name} Team',
    date: 'Mar 5, 2026',
    readTime: '5 min read',
  },
  {
    id: 4,
    title: 'A Deep Dive into ${site.topics[0] || site.niche} Best Practices',
    excerpt: 'Industry experts share their proven strategies and techniques for mastering ${site.topics[0] || site.niche.toLowerCase()}.',
    category: '${site.topics[0] || 'General'}',
    author: 'Guest Writer',
    date: 'Mar 3, 2026',
    readTime: '10 min read',
  },
  {
    id: 5,
    title: 'The Beginners Guide to ${site.topics[3] || site.niche}',
    excerpt: 'New to ${site.topics[3] || site.niche.toLowerCase()}? This step-by-step guide will get you up to speed quickly and efficiently.',
    category: '${site.topics[3] || 'Guides'}',
    author: '${site.name} Team',
    date: 'Feb 28, 2026',
    readTime: '7 min read',
  },
  {
    id: 6,
    title: 'How ${site.niche} Is Changing the World Around Us',
    excerpt: 'From everyday life to global industries, discover the profound impact ${site.niche.toLowerCase()} continues to have.',
    category: '${site.topics[1] || 'Features'}',
    author: 'Editorial Staff',
    date: 'Feb 25, 2026',
    readTime: '9 min read',
  },
];

const categories = [${site.topics.map(t => `'${t}'`).join(', ')}];

const tags = [${site.topics.map(t => `'${t}'`).join(', ')}, '${site.niche}', 'Tips', 'Tutorials', 'News', '2026', 'Best Practices'];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-${site.tw}-600 mb-4">
            Welcome to
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl font-bold text-gray-900 mb-4">
            ${site.name}
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-3">
            ${site.tagline}
          </p>
          <p className="text-base text-gray-400 max-w-xl mx-auto mb-8">
            ${site.description}
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white font-medium px-8 py-3 rounded-md transition-colors text-sm tracking-wide"
          >
            Start Reading
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Latest Posts + Sidebar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-3xl font-bold text-gray-900">Latest Posts</h2>
              <Link href="/blog" className="text-${site.tw}-600 hover:text-${site.tw}-700 text-sm font-medium">
                View All &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
                >
                  {/* Placeholder Image */}
                  <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  <div className="p-5">
                    {/* Category Badge */}
                    <span className="inline-block text-xs font-semibold tracking-wide uppercase text-${site.tw}-600 bg-${site.tw}-50 px-2.5 py-1 rounded mb-3">
                      {post.category}
                    </span>

                    {/* Title */}
                    <h3 className="font-serif text-lg font-bold text-gray-900 mb-2 group-hover:text-${site.tw}-600 transition-colors line-clamp-2">
                      <Link href="/blog">{post.title}</Link>
                    </h3>

                    {/* Excerpt */}
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{post.excerpt}</p>

                    {/* Author + Date */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                          </svg>
                        </div>
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{post.date}</span>
                        <span className="text-gray-300">|</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-10">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 hover:border-${site.tw}-400 hover:text-${site.tw}-600 font-medium px-6 py-2.5 rounded-md transition-colors text-sm"
              >
                Load More Posts
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-80 flex-shrink-0 space-y-8">
            {/* Popular Categories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                Popular Categories
              </h3>
              <ul className="space-y-3">
                {categories.map((cat, i) => (
                  <li key={i}>
                    <Link
                      href="/blog"
                      className="flex items-center justify-between text-sm text-gray-600 hover:text-${site.tw}-600 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-${site.tw}-500" />
                        {cat}
                      </span>
                      <span className="text-xs text-gray-400">{Math.floor(Math.random() * 20) + 5}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Signup */}
            <div className="bg-${site.tw}-50 rounded-lg border border-${site.tw}-100 p-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">
                Newsletter
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Get the latest ${site.niche.toLowerCase()} insights delivered straight to your inbox. No spam, ever.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-${site.tw}-500 focus:border-transparent bg-white"
                  readOnly
                />
                <button className="w-full bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white text-sm font-medium py-2.5 rounded-md transition-colors">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Popular Tags */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-serif text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                Popular Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <Link
                    key={i}
                    href="/blog"
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-${site.tw}-50 hover:text-${site.tw}-600 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* About the Blog */}
      <section className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-4">About ${site.name}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-6 leading-relaxed">
            ${site.name} is your trusted source for everything ${site.niche.toLowerCase()}. We publish thoughtful articles,
            in-depth guides, and expert analysis to help you stay informed and ahead of the curve.
            Whether you are a beginner or a seasoned professional, there is something here for you.
          </p>
          <Link
            href="/about"
            className="text-${site.tw}-600 hover:text-${site.tw}-700 text-sm font-medium underline underline-offset-4"
          >
            Learn more about us &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}`;
}

function generateAboutPage(site) {
  return `'use client';
import Image from 'next/image';
import Link from 'next/link';

const topics = [${site.topics.map(t => `'${t}'`).join(', ')}];

const topicDescriptions: Record<string, string> = {
${site.topics.map(t => `  '${t}': 'Stay up to date with our comprehensive coverage of ${t.toLowerCase()}. We break down the latest developments and share practical insights you can use.',`).join('\n')}
};

const topicIcons: Record<string, string> = {
${site.topics.map((t, i) => {
    const icons = [
      'M13 10V3L4 14h7v7l9-11h-7z',
      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    ];
    return `  '${t}': '${icons[i % icons.length]}',`;
  }).join('\n')}
};

export default function About() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <section className="relative bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-sm font-semibold tracking-widest uppercase text-${site.tw}-600 mb-4">
            Who We Are
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl font-bold text-gray-900 mb-4">
            About ${site.name}
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            ${site.tagline} &mdash; ${site.description.toLowerCase()}.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12">
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="prose prose-gray max-w-none space-y-5 text-gray-600 leading-relaxed">
            <p>
              ${site.name} was founded with a simple mission: to make ${site.niche.toLowerCase()} accessible,
              understandable, and actionable for everyone. In a world overflowing with information,
              we saw the need for a trusted voice that could cut through the noise and deliver
              content that truly matters.
            </p>
            <p>
              What started as a small passion project has grown into a thriving community of readers,
              contributors, and ${site.niche.toLowerCase()} enthusiasts. Our team of experienced writers and
              industry experts work tirelessly to bring you the latest news, in-depth analysis, and
              practical guides across topics like ${site.topics.slice(0, 3).join(', ')}, and more.
            </p>
            <p>
              We believe that great content has the power to educate, inspire, and drive meaningful change.
              Every article we publish is carefully researched, thoughtfully written, and designed to provide
              real value to our readers. Whether you are just getting started or you are a seasoned
              professional, ${site.name} is here to support your journey.
            </p>
          </div>
        </div>
      </section>

      {/* What We Cover */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold tracking-widest uppercase text-${site.tw}-600 mb-2">
              Our Focus
            </p>
            <h2 className="font-serif text-3xl font-bold text-gray-900 mb-3">What We Cover</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              We focus on the topics that matter most in the ${site.niche.toLowerCase()} space,
              delivering expert-level content across these key areas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.map((topic, index) => (
              <div
                key={index}
                className="group bg-gray-50 hover:bg-${site.tw}-50 border border-gray-200 hover:border-${site.tw}-200 rounded-lg p-6 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center mb-4 group-hover:bg-${site.tw}-200 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={topicIcons[topic] || 'M13 10V3L4 14h7v7l9-11h-7z'}
                    />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">{topic}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {topicDescriptions[topic] || \`Explore our latest content about \${topic.toLowerCase()} and discover what is new.\`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-xl bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="font-serif text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our mission at ${site.name} is to be the most trusted and comprehensive resource in the
                ${site.niche.toLowerCase()} space. We are committed to delivering high-quality, well-researched
                content that empowers our readers to make informed decisions and stay ahead of industry trends.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We strive to build a community where knowledge is shared freely, diverse perspectives are
                valued, and every reader can find content tailored to their level of expertise. From
                beginner-friendly tutorials to advanced deep dives, we cover the full spectrum.
              </p>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Publish accurate, well-researched content backed by industry expertise</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Make ${site.niche.toLowerCase()} knowledge accessible to readers of all levels</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Foster a welcoming community for learners and experts alike</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 w-5 h-5 rounded-full bg-${site.tw}-100 text-${site.tw}-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Stay independent and transparent in everything we publish</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-3">Ready to Dive In?</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-8">
            Explore our latest articles and discover why thousands of readers trust ${site.name}
            as their go-to ${site.niche.toLowerCase()} resource.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 bg-${site.tw}-600 hover:bg-${site.tw}-700 text-white font-medium px-8 py-3 rounded-md transition-colors text-sm tracking-wide"
            >
              Explore Posts
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 hover:border-${site.tw}-400 hover:text-${site.tw}-600 font-medium px-8 py-3 rounded-md transition-colors text-sm tracking-wide"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}`;
}

module.exports = { generateHomePage, generateAboutPage };
