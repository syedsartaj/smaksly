'use client';

import { useEffect, useState } from 'react';


import { useRouter } from 'next/navigation';
import { Menu } from '@headlessui/react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface Deployment {
  vercel_id: string;
  SPREADSHEET_ID: string;
  git_repo: string;
  Domain?: string;
  token?: string;
  category?: string;
  Custom_Domain?: string;
}

export default function DashboardPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [token, setToken] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchDeployments = async () => {
      const email = localStorage.getItem('userEmail');
      if (!email) return;

      const res = await fetch('/api/fetch-deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setDeployments(data.deployments || []);
      console.log('🚀 Fetched deployments:', data);
    };

    fetchDeployments();
  }, []);

  const handleDelete = async (d: any) => {
    if (!confirm(`Are you sure you want to delete ${d.vercel_id}?`)) return;
    const projectName = d.git_repo.split('/').pop()?.replace('.git', '');

    try {
      const res = await fetch('/api/delete-deployment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: localStorage.getItem('userEmail')||'',
          vercel_id: d.vercel_id,
          git_repo: projectName,
          SPREADSHEET_ID: d.SPREADSHEET_ID,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('✅ Deleted successfully!');
        setDeployments((prev) => prev.filter((item: any) => item.SPREADSHEET_ID !== d.SPREADSHEET_ID));
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Deletion failed');
    }
  };

  const openDomainModal = async (deployment: Deployment) => {
    const email = localStorage.getItem('userEmail');
    const res = await fetch('/api/generate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vercel_id: deployment.vercel_id, email }),
    });
    const data = await res.json();
    setSelectedDeployment(deployment);
    setToken(data.token);
    setDomainInput('');
    setShowModal(true);
  };

  const handleDomainVerification = async () => {
    if (!selectedDeployment || !token || !domainInput) {
      console.log('Missing selectedDeployment, token, or domainInput');
      return;
    }

    let attempts = 0;
    console.log('🔄 Starting domain verification...');

    const interval = setInterval(async () => {
      attempts++;
      console.log(`🔁 Attempt ${attempts}: Verifying domain...`);

      try {
        const res = await fetch('/api/verify-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domainInput, token }),
        });

        const data = await res.json();
        console.log('🔍 Verification response:', data);

        if (data.verified) {
          clearInterval(interval);
          console.log('✅ Domain verified. Adding to Vercel...');

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

          console.log('✅ Domain added to Vercel.');
          setShowModal(false);
        }
      } catch (err) {
        console.error('❌ Verification failed:', err);
      }

      if (attempts >= 15) {
        clearInterval(interval);
        console.warn('⏱️ Domain verification timed out after 30 minutes.');
      }
    }, 120000);
  };

  return (
    <div className="min-h-screen p-6 bg-[#1f1d1d] text-white">
      <main className="max-w-7xl mx-auto">
  <h2 className="text-xl font-semibold mb-4">Portfolios</h2>

  {/* Grid layout */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {deployments.map((item, idx) => (
      <motion.div
        key={idx}
        whileHover={{ scale: 1.02 }}
        className="bg-[#2c2b2b] border border-[#4e4d4d] p-4 rounded flex flex-col transition-all duration-200 hover:shadow-[0_0_15px_#00BFA5] hover:border-[#00BFA5]"
      >
        <div className="flex flex-col mb-3">
          {item.Custom_Domain && (
            <p className="text-gray-300 text-sm">Custom Domain: {item.Custom_Domain}</p>
          )}
          {!item.Custom_Domain && item.Domain && (
            <p className="text-gray-300 text-sm">Domain: {item.Domain}</p>
          )}
          {item.category && (
            <p className="text-gray-400 text-sm">Category: {item.category?.toUpperCase()}</p>
          )}
        </div>

        {/* First Look / Website Preview */}
{/* First Look / Website Preview */}
{(item.Domain || item.Custom_Domain) && (
  <div className="w-full h-48 bg-[#1a1a1a] border border-[#00BFA5] rounded overflow-hidden mb-3 relative">
    <div className="absolute top-0 left-0 w-[125%] h-[125%] scale-[0.8] origin-top-left">
      <iframe
        src={item.Custom_Domain || item.Domain}
        className="w-full h-full"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  </div>
)}


        {/* Menu */}
        <Menu as="div" className="relative inline-block text-left self-end">
          <Menu.Button className="hover:bg-[#1e1e1e] hover:text-[#00BFA5] hover:shadow-[0_0_8px_#00BFA5] px-3 py-1 rounded inline-flex items-center text-white transition-all duration-200">
            <MoreVertical size={16} />
          </Menu.Button>
          <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-[#2b2b2b] shadow-lg ring-1 ring-black ring-opacity-30 focus:outline-none text-sm">
            <div className="px-1 py-1 space-y-1">
              {[
                { label: 'View Site', icon: '🔍', action: () => window.open(item.Domain, '_blank'), color: 'hover:text-[#00BFA5]' },
                { label: 'Create Post', icon: '➕', action: () => router.push(`/post?smaksly_id=${item.vercel_id}`), color: 'hover:text-[#00BFA5]' },
              ].map((btn) => (
                <Menu.Item key={btn.label}>
                  {({ active }) => (
                    <motion.button
                      onClick={btn.action}
                      whileHover={{ scale: 1.05 }}
                      className={`group flex w-full items-center rounded-md px-3 py-2 transition-all duration-200 ${active ? 'bg-[#444] ' + btn.color : 'text-white'}`}
                    >
                      <span className="mr-2">{btn.icon}</span> {btn.label}
                    </motion.button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Menu>
      </motion.div>
    ))}
  </div>
</main>

{showModal && (
  <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded max-w-md text-black">
      <h3 className="text-lg font-bold mb-2">Add Your Custom Domain</h3>
      
      <input
        className="w-full border px-2 py-1 rounded mb-2"
        placeholder="Enter your domain (e.g., example.com)"
        value={domainInput}
        onChange={(e) => setDomainInput(e.target.value)}
      />

      <p className="mb-2 font-semibold">📌 DNS TXT Record (for Vercel Verification)</p>
      <pre className="bg-gray-100 p-2 rounded">Name: _vercel-smaksly</pre>
      <pre className="bg-gray-100 p-2 rounded">Type: TXT</pre>
      <pre className="bg-gray-100 p-2 rounded">Value: {token}</pre>

      <hr className="my-4" />

      <p className="mb-2 font-semibold">🔎 Google Search Console Setup (Optional but Recommended)</p>
      <p className="text-sm mb-2">
        To enable search analytics and indexing tracking, please add our service account as a verified user in your Google Search Console property.
      </p>
      <ul className="text-sm list-disc list-inside mb-2 space-y-1">
        <li>Go to <a href="https://search.google.com/search-console/users" className="text-blue-600 underline" target="_blank">Search Console Users & Permissions</a></li>
        <li>Select your domain property</li>
        <li>Click "Add User" ➕</li>
        <li>Email: <code className="bg-gray-200 px-1 rounded">sartaj@school-3e831.iam.gserviceaccount.com</code></li>
        <li>Permission: <strong>Full</strong> access</li>
      </ul>

      <p className="text-xs text-gray-500">
        Once added, we will automatically fetch your domain analytics via Search Console API.
      </p>

      <div className="flex justify-between mt-4">
        <button onClick={() => setShowModal(false)} className="bg-gray-800 text-white px-3 py-1 rounded">Close</button>
        <button onClick={handleDomainVerification} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Update</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}