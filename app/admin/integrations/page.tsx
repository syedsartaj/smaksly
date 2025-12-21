'use client';

import { useState } from 'react';


import { motion, AnimatePresence } from 'framer-motion';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'deployment' | 'analytics' | 'storage' | 'ai' | 'communication';
  connected: boolean;
  features: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy your websites with automatic CI/CD',
    icon: '▲',
    category: 'deployment',
    connected: true,
    features: ['Auto deployments', 'Preview URLs', 'Custom domains', 'Edge functions'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your repositories for seamless deployments',
    icon: '🐙',
    category: 'deployment',
    connected: true,
    features: ['Repo sync', 'Webhooks', 'CI/CD pipelines', 'Branch protection'],
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track website traffic and user behavior',
    icon: '📊',
    category: 'analytics',
    connected: false,
    features: ['Traffic reports', 'User behavior', 'Conversion tracking', 'Real-time data'],
  },
  {
    id: 'search-console',
    name: 'Search Console',
    description: 'Monitor your search performance and SEO',
    icon: '🔍',
    category: 'analytics',
    connected: true,
    features: ['Search rankings', 'CTR reports', 'Index status', 'Sitemap submission'],
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    description: 'Optimize and manage your media assets',
    icon: '☁️',
    category: 'storage',
    connected: true,
    features: ['Image optimization', 'Video processing', 'CDN delivery', 'Transformations'],
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Cloud storage for your files and backups',
    icon: '🪣',
    category: 'storage',
    connected: false,
    features: ['File storage', 'Backups', 'Static hosting', 'Object versioning'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI-powered content generation',
    icon: '🤖',
    category: 'ai',
    connected: true,
    features: ['Content generation', 'SEO writing', 'Auto descriptions', 'Chat support'],
  },
  {
    id: 'anthropic',
    name: 'Claude AI',
    description: 'Advanced AI for complex tasks',
    icon: '🧠',
    category: 'ai',
    connected: false,
    features: ['Long content', 'Code generation', 'Analysis', 'Research'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notifications in your Slack workspace',
    icon: '💬',
    category: 'communication',
    connected: false,
    features: ['Deploy alerts', 'Error notifications', 'Team updates', 'Scheduled reports'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect to your Discord server',
    icon: '🎮',
    category: 'communication',
    connected: false,
    features: ['Webhooks', 'Bot commands', 'Channel alerts', 'Team coordination'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'deployment', label: 'Deployment', icon: '🚀' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'communication', label: 'Communication', icon: '💬' },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const filteredIntegrations =
    selectedCategory === 'all'
      ? integrations
      : integrations.filter((i) => i.category === selectedCategory);

  const connectedCount = integrations.filter((i) => i.connected).length;

  const handleConnect = async (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowModal(true);
  };

  const handleConfirmConnect = async () => {
    if (!selectedIntegration) return;

    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === selectedIntegration.id ? { ...i, connected: !i.connected } : i
        )
      );

      setMessage({
        type: 'success',
        text: selectedIntegration.connected
          ? `${selectedIntegration.name} disconnected`
          : `${selectedIntegration.name} connected successfully!`,
      });

      setTimeout(() => {
        setShowModal(false);
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Integrations</h1>
            <p className="text-gray-400">Connect your favorite tools and services</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Connected</p>
                  <p className="text-2xl font-bold text-white">{connectedCount}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Available</p>
                  <p className="text-2xl font-bold text-white">{integrations.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Categories</p>
                  <p className="text-2xl font-bold text-white">{CATEGORIES.length - 1}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white'
                    : 'bg-[#1C1936] border border-[#2d2a4a] text-gray-300 hover:bg-[#2d2a4a]'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration, idx) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl overflow-hidden hover:border-[#9929EA]/30 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#2d2a4a] to-[#1C1936] rounded-xl flex items-center justify-center text-2xl">
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{integration.name}</h3>
                        <span className="text-xs text-gray-400 capitalize">{integration.category}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        integration.connected
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {integration.connected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4">{integration.description}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {integration.features.slice(0, 3).map((feature, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-[#0C0A1F] text-gray-400 text-xs rounded-lg"
                      >
                        {feature}
                      </span>
                    ))}
                    {integration.features.length > 3 && (
                      <span className="px-2 py-1 text-gray-500 text-xs">
                        +{integration.features.length - 3} more
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleConnect(integration)}
                    className={`w-full py-2 rounded-lg font-medium transition-all ${
                      integration.connected
                        ? 'bg-[#2d2a4a] text-gray-300 hover:bg-[#3d3a5a]'
                        : 'bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white hover:opacity-90'
                    }`}
                  >
                    {integration.connected ? 'Manage' : 'Connect'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      {/* Connection Modal */}
      <AnimatePresence>
        {showModal && selectedIntegration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isConnecting && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-md"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2d2a4a] to-[#1C1936] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {selectedIntegration.icon}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedIntegration.name}</h2>
                <p className="text-gray-400 text-sm mt-2">{selectedIntegration.description}</p>
              </div>

              <div className="bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl p-4 mb-6">
                <h3 className="text-white font-medium mb-3">Features</h3>
                <ul className="space-y-2">
                  {selectedIntegration.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {message.text && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 ${
                    message.type === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isConnecting}
                  className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmConnect}
                  disabled={isConnecting}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
                    selectedIntegration.connected
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white hover:opacity-90'
                  }`}
                >
                  {isConnecting
                    ? 'Processing...'
                    : selectedIntegration.connected
                    ? 'Disconnect'
                    : 'Connect'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
