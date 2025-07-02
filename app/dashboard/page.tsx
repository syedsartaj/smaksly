'use client';

import { useEffect, useState } from 'react';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [deployments, setDeployments] = useState([]);
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

  return (
    <div className="flex h-screen w-full m-0 p-0">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto bg-[#1f1d1d] text-white">
          <h2 className="text-xl font-semibold mb-4">Your Deployments</h2>
          <ul className="space-y-3">
            {deployments.map((item :any, idx) => (
              <li key={idx} className="bg-[#403f3f] border-[0.1px] border-[#6e6e6e] p-3 rounded flex justify-between items-center">
                <div className="text-sm">
                  <p className="font-medium">🔁 {item.vercel_id}</p>
                  <p className="text-white text-xs">{item.DOMAIN}</p>
                </div>
                <div className="space-x-2">
                  <button
                    className="text-[#E4E4E7] px-2 py-1 rounded hover:bg-[#2A2B2D] hover:text-white active:bg-[#403f3f] active:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    onClick={() => window.open(item.DOMAIN, '_blank')}
                    title="View deployment"
                    aria-label="View deployment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0c0-5.5-7-10-9-10s-9 4.5-9 10 7 10 9 10 9-4.5 9-10z"
                      />
                    </svg>
                  </button>
                  <button
                    className="text-[#E4E4E7] px-2 py-1 rounded hover:bg-[#2A2B2D] hover:text-white active:bg-[#403f3f] active:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    onClick={() => router.push(`/post?spreadsheetId=${item.SPREADSHEET_ID}`)}
                    title="Add content"
                    aria-label="Add content"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </main>
      </div>
    </div>
  );
}