'use client';

import { useEffect, useState } from 'react';


import { motion, AnimatePresence } from 'framer-motion';

interface Deployment {
  vercel_id: string;
  Domain?: string;
  Custom_Domain?: string;
  token?: string;
  category?: string;
}

interface DomainStatus {
  domain: string;
  status: 'pending' | 'verified' | 'error';
  vercel_id: string;
}

export default function DomainPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [token, setToken] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
      const res = await fetch('/api/fetch-deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setDeployments(data.deployments || []);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    }
  };

  const openDomainModal = async (deployment: Deployment) => {
    const email = localStorage.getItem('userEmail');
    try {
      const res = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercel_id: deployment.vercel_id, email }),
      });
      const data = await res.json();
      setSelectedDeployment(deployment);
      setToken(data.token);
      setDomainInput('');
      setVerificationStatus('idle');
      setMessage({ type: '', text: '' });
      setShowModal(true);
    } catch (error) {
      console.error('Failed to generate token:', error);
    }
  };

  const handleVerifyDomain = async () => {
    if (!selectedDeployment || !token || !domainInput) {
      setMessage({ type: 'error', text: 'Please enter a domain' });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('checking');
    setMessage({ type: 'info', text: 'Checking DNS records... This may take a moment.' });

    try {
      const res = await fetch('/api/verify-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput, token }),
      });

      const data = await res.json();

      if (data.verified) {
        setVerificationStatus('success');
        setMessage({ type: 'success', text: 'Domain verified! Adding to Vercel...' });

        await fetch('/api/add-domain-to-vercel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: domainInput,
            vercel_id: selectedDeployment.vercel_id,
            email: localStorage.getItem('userEmail'),
            token,
          }),
        });

        setMessage({ type: 'success', text: 'Domain added successfully!' });
        setTimeout(() => {
          setShowModal(false);
          fetchDeployments();
        }, 2000);
      } else {
        setVerificationStatus('failed');
        setMessage({ type: 'error', text: 'Domain verification failed. Please check your DNS settings and try again.' });
      }
    } catch (error) {
      setVerificationStatus('failed');
      setMessage({ type: 'error', text: 'Verification error. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 2000);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
      <main className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Domain Management</h1>
            <p className="text-gray-400">Connect custom domains to your deployments</p>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-[#9929EA]/20 to-[#6C63FF]/20 border border-[#9929EA]/30 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#9929EA]/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#9929EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">How to Connect Your Domain</h3>
                <ol className="text-gray-300 text-sm space-y-2">
                  <li>1. Click "Add Domain" on any deployment below</li>
                  <li>2. Enter your domain name (e.g., example.com)</li>
                  <li>3. Add the TXT record to your DNS provider</li>
                  <li>4. Click verify and wait for DNS propagation</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Domains</p>
                  <p className="text-2xl font-bold text-white">{deployments.filter(d => d.Custom_Domain).length}</p>
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
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Active Deployments</p>
                  <p className="text-2xl font-bold text-white">{deployments.length}</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">SSL Certificates</p>
                  <p className="text-2xl font-bold text-white">{deployments.filter(d => d.Custom_Domain).length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Deployments List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Your Deployments</h2>

            {deployments.length === 0 ? (
              <div className="text-center py-16 bg-[#1C1936]/30 rounded-xl border border-[#2d2a4a]">
                <div className="w-20 h-20 bg-[#2d2a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Deployments Found</h3>
                <p className="text-gray-400">Deploy a project first to add custom domains</p>
              </div>
            ) : (
              deployments.map((deployment, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-5 hover:border-[#9929EA]/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#9929EA] to-[#6C63FF] rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-white">{deployment.vercel_id}</p>
                          <p className="text-sm text-gray-400">{deployment.category?.toUpperCase() || 'General'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {deployment.Domain && (
                          <a
                            href={deployment.Domain}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm hover:bg-blue-500/30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {deployment.Domain.replace('https://', '')}
                          </a>
                        )}
                        {deployment.Custom_Domain && (
                          <a
                            href={`https://${deployment.Custom_Domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm hover:bg-green-500/30 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {deployment.Custom_Domain}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {deployment.Custom_Domain ? (
                        <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium">
                          Domain Connected
                        </span>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openDomainModal(deployment)}
                          className="px-4 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Add Domain
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </main>

      {/* Add Domain Modal */}
      <AnimatePresence>
        {showModal && selectedDeployment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !isVerifying && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Add Custom Domain</h2>
              <p className="text-gray-400 text-sm mb-6">Connect your domain to {selectedDeployment.vercel_id}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Your Domain</label>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    disabled={isVerifying}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA] disabled:opacity-50"
                  />
                </div>

                {/* DNS Instructions */}
                <div className="bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#9929EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    DNS TXT Record
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-[#1C1936] rounded-lg">
                      <span className="text-gray-400 text-sm">Name:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white text-sm">_vercel-smaksly</code>
                        <button
                          onClick={() => copyToClipboard('_vercel-smaksly')}
                          className="text-[#9929EA] hover:text-[#b44dff]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#1C1936] rounded-lg">
                      <span className="text-gray-400 text-sm">Type:</span>
                      <code className="text-white text-sm">TXT</code>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#1C1936] rounded-lg">
                      <span className="text-gray-400 text-sm">Value:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-white text-sm truncate max-w-[200px]">{token}</code>
                        <button
                          onClick={() => copyToClipboard(token)}
                          className="text-[#9929EA] hover:text-[#b44dff]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google Search Console */}
                <div className="bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Google Search Console (Optional)
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">Add our service account to enable analytics:</p>
                  <div className="flex items-center justify-between p-2 bg-[#1C1936] rounded-lg">
                    <code className="text-white text-xs truncate">sartaj@school-3e831.iam.gserviceaccount.com</code>
                    <button
                      onClick={() => copyToClipboard('sartaj@school-3e831.iam.gserviceaccount.com')}
                      className="text-[#9929EA] hover:text-[#b44dff] ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Verification Status */}
                {verificationStatus !== 'idle' && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 ${
                    verificationStatus === 'checking' ? 'bg-blue-500/20 border border-blue-500/30' :
                    verificationStatus === 'success' ? 'bg-green-500/20 border border-green-500/30' :
                    'bg-red-500/20 border border-red-500/30'
                  }`}>
                    {verificationStatus === 'checking' && (
                      <svg className="animate-spin w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {verificationStatus === 'success' && (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {verificationStatus === 'failed' && (
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className={`text-sm ${
                      verificationStatus === 'checking' ? 'text-blue-400' :
                      verificationStatus === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {message.text}
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isVerifying}
                    className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyDomain}
                    disabled={isVerifying || !domainInput}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Domain'}
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
