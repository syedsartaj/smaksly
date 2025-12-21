'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  previewUrl: string;
  repoUrl: string;
  features: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  techStack: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'minimalist-blog',
    name: 'Minimalist Blog',
    description: 'A clean, typography-focused blog template for thoughtful writing. Perfect for personal blogs, essays, and long-form content.',
    category: 'Personal',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/minimalist-blog',
    features: ['Clean Typography', 'Newsletter Signup', 'SEO Optimized', 'Dark/Light Mode'],
    colors: { primary: '#1a1a1a', secondary: '#666666', accent: '#0066cc' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'tech-developer-blog',
    name: 'Tech Developer Blog',
    description: 'A dark-themed, code-friendly blog for developers. Features syntax highlighting, code snippets, and tech-focused design.',
    category: 'Tech',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/tech-developer-blog',
    features: ['Syntax Highlighting', 'Code Snippets', 'Dark Theme', 'Category Tags'],
    colors: { primary: '#0d1117', secondary: '#161b22', accent: '#00ff88' },
    techStack: ['Next.js', 'Tailwind CSS', 'Prism.js', 'MongoDB'],
  },
  {
    id: 'lifestyle-magazine',
    name: 'Lifestyle Magazine',
    description: 'A vibrant, image-heavy lifestyle blog with Pinterest-style masonry layout. Perfect for fashion, beauty, and lifestyle content.',
    category: 'Lifestyle',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/lifestyle-magazine',
    features: ['Masonry Grid', 'Instagram Feed', 'Category Pills', 'Newsletter'],
    colors: { primary: '#ff6b9d', secondary: '#ff8a80', accent: '#ffb3ba' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'business-corporate',
    name: 'Business Corporate',
    description: 'A professional, corporate blog for business intelligence and thought leadership. Trustworthy design for enterprise audiences.',
    category: 'Business',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/business-corporate',
    features: ['Professional Design', 'Author Profiles', 'Industry Categories', 'Analytics'],
    colors: { primary: '#1e3a5f', secondary: '#2563eb', accent: '#ffffff' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    description: 'An artistic, gallery-style blog for designers and creatives. Bold visuals with striking black, white, and gold aesthetics.',
    category: 'Creative',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/creative-portfolio',
    features: ['Gallery Grid', 'Case Studies', 'Full-width Images', 'Lightbox'],
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#ffd700' },
    techStack: ['Next.js', 'Tailwind CSS', 'Framer Motion', 'MongoDB'],
  },
  {
    id: 'news-editorial',
    name: 'News Editorial',
    description: 'A multi-column news magazine layout with breaking news ticker. Classic newspaper aesthetics for editorial content.',
    category: 'News',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/news-editorial',
    features: ['Breaking News Ticker', 'Multi-column Layout', 'Category Sections', 'Author Bylines'],
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#dc2626' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'personal-journal',
    name: 'Personal Journal',
    description: 'A warm, intimate personal blog with handwritten-style typography. Perfect for personal stories and reflective writing.',
    category: 'Personal',
    image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/personal-journal',
    features: ['Journal Entries', 'Author Bio', 'Warm Design', 'Reading Time'],
    colors: { primary: '#faf8f5', secondary: '#8b7355', accent: '#c67b5c' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'ecommerce-blog',
    name: 'E-commerce Blog',
    description: 'A product + content hybrid blog for online stores. Seamlessly integrate product showcases with valuable content marketing.',
    category: 'E-commerce',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/ecommerce-blog',
    features: ['Product Cards', 'Reviews Section', 'Shopping Cart', 'Affiliate Ready'],
    colors: { primary: '#ffffff', secondary: '#000000', accent: '#10b981' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'food-recipe-blog',
    name: 'Food & Recipe Blog',
    description: 'A visual, card-based food blog with recipe management. Appetizing design with cook times, difficulty levels, and ratings.',
    category: 'Food',
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/food-recipe-blog',
    features: ['Recipe Cards', 'Category Filters', 'Cook Time', 'Difficulty Ratings'],
    colors: { primary: '#f97316', secondary: '#ef4444', accent: '#fef3c7' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
  {
    id: 'travel-adventure',
    name: 'Travel Adventure',
    description: 'A full-width, immersive travel blog with stunning hero images. Perfect for travel stories, destination guides, and adventures.',
    category: 'Travel',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop',
    previewUrl: '#',
    repoUrl: 'https://github.com/syedsartaj/travel-adventure',
    features: ['Hero Slider', 'Destination Cards', 'Travel Stats', 'Country Flags'],
    colors: { primary: '#0ea5e9', secondary: '#fb923c', accent: '#1e293b' },
    techStack: ['Next.js', 'Tailwind CSS', 'MongoDB', 'OpenAI'],
  },
];

const CATEGORIES = ['All', 'Personal', 'Tech', 'Lifestyle', 'Business', 'Creative', 'News', 'E-commerce', 'Food', 'Travel'];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDeploy = async (template: Template) => {
    const email = localStorage.getItem('userEmail');
    if (!email) {
      alert('Please login first');
      return;
    }

    setIsDeploying(true);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: template.repoUrl,
          userEmail: email,
          category: template.category.toLowerCase(),
        }),
      });

      const data = await res.json();
      if (data.url) {
        alert(`Template deployed successfully!\nURL: ${data.url}`);
        setSelectedTemplate(null);
      } else {
        alert(`Deployment failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Deployment failed. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-[#9929EA]/20 to-[#6C63FF]/20 border-b border-[#2d2a4a]">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Blog Templates
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mb-8">
                Choose from 10 professionally designed blog templates. Each template is optimized for SEO,
                supports AI-generated content, and deploys to Vercel in one click.
              </p>

              {/* Search */}
              <div className="relative max-w-md">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#1C1936] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                />
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white'
                      : 'bg-[#1C1936] text-gray-300 hover:bg-[#2d2a4a] border border-[#2d2a4a]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="max-w-7xl mx-auto px-6 pb-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template, idx) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-2xl overflow-hidden hover:border-[#9929EA]/50 transition-all group"
                >
                  {/* Template Image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={template.image}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Color Preview */}
                    <div className="absolute top-4 right-4 flex gap-1">
                      <div className="w-4 h-4 rounded-full border-2 border-white/30" style={{ backgroundColor: template.colors.primary }} />
                      <div className="w-4 h-4 rounded-full border-2 border-white/30" style={{ backgroundColor: template.colors.accent }} />
                    </div>

                    {/* Category Badge */}
                    <span className="absolute top-4 left-4 px-3 py-1 bg-[#9929EA] text-white text-xs font-medium rounded-full">
                      {template.category}
                    </span>

                    {/* Template Name */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white mb-1">{template.name}</h3>
                      <div className="flex gap-2">
                        {template.techStack.slice(0, 2).map((tech) => (
                          <span key={tech} className="text-xs text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-5">
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.features.slice(0, 3).map((feature) => (
                        <span key={feature} className="text-xs text-[#9929EA] bg-[#9929EA]/10 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="flex-1 px-4 py-2 bg-[#2d2a4a] text-white rounded-lg text-sm font-medium hover:bg-[#3d3a5a] transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => handleDeploy(template)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Deploy
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-[#1C1936] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No templates found</h3>
                <p className="text-gray-400">Try adjusting your search or filter</p>
              </div>
            )}
          </div>

      {/* Template Preview Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={selectedTemplate.image}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1936] via-black/50 to-transparent" />
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <span className="px-3 py-1 bg-[#9929EA] text-white text-xs font-medium rounded-full">
                    {selectedTemplate.category}
                  </span>
                  <h2 className="text-3xl font-bold text-white mt-2">{selectedTemplate.name}</h2>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)]">
                <p className="text-gray-300 mb-6">{selectedTemplate.description}</p>

                {/* Features */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3">Features</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-gray-300">
                        <svg className="w-4 h-4 text-[#9929EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Stack */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.techStack.map((tech) => (
                      <span key={tech} className="px-3 py-1 bg-[#0C0A1F] text-gray-300 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-3">Color Palette</h3>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: selectedTemplate.colors.primary }} />
                      <span className="text-gray-400 text-sm">Primary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: selectedTemplate.colors.secondary }} />
                      <span className="text-gray-400 text-sm">Secondary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg border border-white/20" style={{ backgroundColor: selectedTemplate.colors.accent }} />
                      <span className="text-gray-400 text-sm">Accent</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[#2d2a4a]">
                  <a
                    href={selectedTemplate.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium text-center hover:bg-[#3d3a5a] transition-colors"
                  >
                    View on GitHub
                  </a>
                  <button
                    onClick={() => handleDeploy(selectedTemplate)}
                    disabled={isDeploying}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isDeploying ? 'Deploying...' : 'Deploy to Vercel'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
