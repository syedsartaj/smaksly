'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PostPage() {
    const searchParams = useSearchParams();
  const spreadsheetId = searchParams.get('spreadsheetId'); // 👈 Get ID from URL
  const router = useRouter(); // ✅ For redirection

  const [formData, setFormData] = useState({
    id: '', link: '', code_template: '', title: '', image_url: '',
    robottxt_headline: '', robottxt_url: '', robottxt_auther_name: '',
    robottxt_auther_url: '', robottxt_image_url: '', robottxt_image_width: '',
    robottxt_image_height: '', robottxt_publish_date: '', robottxt_modify_date: '',
    robottxt_publisher_logo: '', robottxt_publisher_keyword: '', category: '', body: ''
  });

  const [status, setStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");
    console.log(spreadsheetId);

    const res = await fetch('/api/add-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId, // 👈 Send it with the request
        ...formData
      }),
    });

    const result = await res.json();
    if (res.ok) {
      setStatus(result.message);
      setTimeout(() => {
        router.push('/dashboard'); // ✅ Redirect to dashboard
      }, 1500); // Small delay to show success message
    } else {
      setStatus(`❌ ${result.error}`);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#1f1d1d]">
        <Header />
        <main className="p-6 max-w-6xl mx-auto bg-[#1f1d1d]">
          <h1 className="text-2xl font-bold mb-4 text-white">📝 Post Data to Google Sheet</h1>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {Object.keys(formData).map((field) => (
              <div key={field} className="col-span-1">
                <label className="block text-sm font-medium mb-1 capitalize text-white">{field.replace(/_/g, ' ')}</label>
                {field === 'body' ? (
                  <textarea
                    name={field}
                    value={formData[field as keyof typeof formData]}
                    onChange={handleChange}
                    rows={4}
                    className="w-full border-b-[0.1px] px-3 py-2 rounded bg-[#403f3f]"
                  />
                ) : (
                  <input
                    type="text"
                    name={field}
                    value={formData[field as keyof typeof formData]}
                    onChange={handleChange}
                    className="w-full border-b-[0.1px] px-3 py-2 rounded bg-[#403f3f]"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded mt-4"
            >
              Submit
            </button>
          </form>
          {status && <p className="mt-4 text-green-700">{status}</p>}
        </main>
      </div>
    </div>
  );
}
