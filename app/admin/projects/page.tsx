'use client';

import { useEffect, useState } from 'react';


import { motion, AnimatePresence } from 'framer-motion';

interface Repo {
  name: string;
  url: string;
  category: string;
  vercel_id?: string;
  createdAt?: string;
}

const CATEGORIES = [
  { id: 'marketing', label: 'Marketing Agency', icon: '📢' },
  { id: 'tech', label: 'Tech Startup', icon: '💻' },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒' },
  { id: 'portfolio', label: 'Portfolio', icon: '🎨' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'saas', label: 'SaaS', icon: '☁️' },
];

export default function ProjectsPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [newRepo, setNewRepo] = useState({ name: '', url: '', category: 'marketing' });
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneCategory, setCloneCategory] = useState('marketing');
  const [isLoading, setIsLoading] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repos');
      const data = await res.json();
      if (data.ok) {
        setRepos(data.repos);
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
    }
  };

  const handleAddRepo = async () => {
    if (!newRepo.name || !newRepo.url) {
      setMessage({ type: 'error', text: 'Name and URL are required' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRepo),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Repository added successfully!' });
        setRepos((prev) => [data.repo, ...prev]);
        setNewRepo({ name: '', url: '', category: 'marketing' });
        setTimeout(() => setShowAddModal(false), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add repository' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneAndDeploy = async () => {
    if (!cloneUrl) {
      setMessage({ type: 'error', text: 'Git URL is required' });
      return;
    }

    const email = localStorage.getItem('userEmail');
    if (!email) {
      setMessage({ type: 'error', text: 'Please login first' });
      return;
    }

    setIsCloning(true);
    setMessage({ type: 'info', text: 'Cloning and deploying... This may take a few minutes.' });

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: cloneUrl,
          userEmail: email,
          category: cloneCategory,
        }),
      });

      const data = await res.json();
      if (data.url) {
        setMessage({ type: 'success', text: `Deployed successfully! URL: ${data.url}` });
        setCloneUrl('');
        setTimeout(() => {
          setShowCloneModal(false);
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Deployment failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsCloning(false);
    }
  };

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          repo.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || repo.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
              <p className="text-gray-400">Manage your Git repositories and deploy new projects</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCloneModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Clone & Deploy
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#1C1936] border border-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#2d2a4a] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Repository
              </motion.button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1C1936] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA] transition-all"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-[#1C1936] border border-[#2d2a4a] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#9929EA] transition-all"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Projects', value: repos.length, icon: '📁', color: 'from-blue-500 to-cyan-500' },
              { label: 'Marketing', value: repos.filter(r => r.category === 'marketing').length, icon: '📢', color: 'from-purple-500 to-pink-500' },
              { label: 'Tech', value: repos.filter(r => r.category === 'tech').length, icon: '💻', color: 'from-green-500 to-emerald-500' },
              { label: 'E-commerce', value: repos.filter(r => r.category === 'ecommerce').length, icon: '🛒', color: 'from-orange-500 to-yellow-500' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}>
                    {stat.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Projects Grid */}
          {filteredRepos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-[#1C1936] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Projects Found</h3>
              <p className="text-gray-400 mb-6">Get started by adding a repository or cloning a project</p>
              <button
                onClick={() => setShowCloneModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium"
              >
                Clone Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRepos.map((repo, idx) => {
                const category = CATEGORIES.find(c => c.id === repo.category);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(153, 41, 234, 0.2)' }}
                    className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#9929EA] to-[#6C63FF] rounded-lg flex items-center justify-center">
                            <span className="text-lg">{category?.icon || '📁'}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{repo.name}</h3>
                            <span className="text-xs text-gray-400">{category?.label || repo.category}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${repo.vercel_id ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {repo.vercel_id ? 'Deployed' : 'Not Deployed'}
                        </span>
                      </div>

                      <p className="text-gray-400 text-sm truncate mb-4">{repo.url}</p>

                      <div className="flex gap-2">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-[#2d2a4a] text-white text-sm rounded-lg text-center hover:bg-[#3d3a5a] transition-colors"
                        >
                          View Repo
                        </a>
                        <button
                          onClick={() => {
                            setCloneUrl(repo.url);
                            setCloneCategory(repo.category || 'marketing');
                            setShowCloneModal(true);
                          }}
                          className="flex-1 px-3 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Deploy
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Add Repository Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add Repository</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Repository Name</label>
                  <input
                    type="text"
                    placeholder="My Awesome Project"
                    value={newRepo.name}
                    onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Git URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repo.git"
                    value={newRepo.url}
                    onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={newRepo.category}
                    onChange={(e) => setNewRepo({ ...newRepo, category: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' ? 'bg-green-500/20 text-green-400' :
                    message.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddRepo}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? 'Adding...' : 'Add Repository'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clone & Deploy Modal */}
      <AnimatePresence>
        {showCloneModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isCloning && setShowCloneModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Clone & Deploy</h2>
              <p className="text-gray-400 text-sm mb-6">Clone a Git repository and deploy it to Vercel instantly</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Git Repository URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repo.git"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    disabled={isCloning}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project Category</label>
                  <select
                    value={cloneCategory}
                    onChange={(e) => setCloneCategory(e.target.value)}
                    disabled={isCloning}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#9929EA] disabled:opacity-50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' ? 'bg-green-500/20 text-green-400' :
                    message.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                {isCloning && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <svg className="animate-spin w-6 h-6 text-[#9929EA]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-gray-300">Deploying to Vercel...</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCloneModal(false)}
                    disabled={isCloning}
                    className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCloneAndDeploy}
                    disabled={isCloning}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isCloning ? 'Deploying...' : 'Deploy Now'}
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
