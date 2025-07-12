'use client';

import { useEffect, useState } from 'react';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { useRouter } from 'next/navigation';

interface Deployment {
  vercel_id: string;
  SPREADSHEET_ID: string;
  git_repo: string;
  DOMAIN?: string;
  token?: string;
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
          email: 'syedsartajahmed01@gmail.com',
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
    <div className="flex h-screen w-full m-0 p-0">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto bg-[#1f1d1d] text-white">
          <h2 className="text-xl font-semibold mb-4">Your Deployments</h2>
          <button
  onClick={async () => {
    const res = await fetch('/api/fetch-low-analytics');
    const json = await res.json();
    alert(json.message || json.error);
  }}
  className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
>
  📤 Fetch All Analytics
</button>

          <ul className="space-y-3">
            {deployments.map((item: any, idx) => (
              <li key={idx} className="bg-[#403f3f] border-[0.1px] border-[#6e6e6e] p-3 rounded flex justify-between items-center">
                <div className="text-sm">
                  <p className="font-medium">🔁 {item.vercel_id}</p>
                  <p className="text-white text-xs">{item.DOMAIN}</p>
                </div>
                <div className="space-x-2">
                  <button onClick={() => window.open(item.DOMAIN, '_blank')} className="px-2 py-1 rounded hover:bg-[#2A2B2D]">🔍</button>
                  <button onClick={() => router.push(`/post?spreadsheetId=${item.SPREADSHEET_ID}`)} className="px-2 py-1 rounded hover:bg-[#2A2B2D]">➕</button>
                  <button onClick={() => router.push(`/editor?spreadsheetId=${item.SPREADSHEET_ID}`)} className="px-2 py-1 rounded hover:bg-[#2A2B2D]">✏️</button>
                  <button onClick={() => router.push(`/edit-blog?spreadsheetId=${item.SPREADSHEET_ID}`)} className="px-2 py-1 rounded hover:bg-[#2A2B2D]">📝</button>
                  <button onClick={() => handleDelete(item)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Delete</button>
                  <button onClick={() => openDomainModal(item)} className="bg-green-600 text-white px-3 py-1 rounded">Add Domain</button>
                  <button onClick={() => router.push(`/analytics?domain=${encodeURIComponent(item.DOMAIN)}`)}className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">📊 View Analytics</button>
                </div>
              </li>
            ))}
          </ul>
        </main>
      </div>

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