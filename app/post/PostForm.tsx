'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';

export default function PostForm() {
  const searchParams = useSearchParams();
  const spreadsheetId = searchParams.get('spreadsheetId');
  const router = useRouter();

  const [keyword, setKeyword] = useState('');
  const [formData, setFormData] = useState({
    link: '', code_template: '', title: '', image_url: '',
    robottxt_headline: '', robottxt_url: '', robottxt_auther_name: '',
    robottxt_auther_url: '', robottxt_image_url: '', robottxt_image_width: '',
    robottxt_image_height: '', robottxt_publish_date: '', robottxt_modify_date: '',
    robottxt_publisher_logo: '', robottxt_publisher_keyword: '', category: '', body: ''
  });

  const [status, setStatus] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generateWithAI = async () => {
    if (!keyword) return alert('Enter a keyword');

    setStatus('Generating...');
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setFormData(prev => ({ ...prev, ...data }));
      setStatus('✅ Generated from AI');
    } catch (err) {
      setStatus(`❌ Failed to generate: ${err}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");
  // Generate slug from title
  const slug = formData.title?.toLowerCase().trim().replace(/\s+/g, '-') || '';

    const res = await fetch('/api/add-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        ...formData,
        slug
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus(data.message);
      setTimeout(() => router.push('/dashboard'), 1500);
    } else {
      setStatus(`❌ ${data.error}`);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#1f1d1d]">
        <Header />
        <main className="p-6 max-w-7xl mx-auto flex gap-6">
          {/* Editor Section */}
          <div className="w-1/2 bg-[#1f1d1d]">
            <h1 className="text-2xl font-bold mb-6 text-white">📝 Create New Post</h1>

            {/* Keyword + Generate Button */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Enter keyword"
                name="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={generateWithAI}
                className="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
              >
                Generate With AI
              </button>
            </div>

            {/* Form Submission */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {Object.keys(formData).map((field) => (
                <div key={field} className="flex flex-col">
                  <label className="text-sm font-medium mb-1 capitalize text-gray-300">
                    {field.replace(/_/g, ' ')}
                  </label>
                  {field === 'body' ? (
                    <textarea
                      name={field}
                      value={formData[field as keyof typeof formData]}
                      onChange={handleChange}
                      rows={8}
                      className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
                      placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                    />
                  ) : (
                    <input
                      type="text"
                      name={field}
                      value={formData[field as keyof typeof formData]}
                      onChange={handleChange}
                      className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Publish
              </button>
            </form>

            {status && <p className="mt-4 text-green-400">{status}</p>}
          </div>

          {/* Preview Section */}
          <div className="w-1/2 bg-gray-100 p-6 rounded-md shadow-lg overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Live Preview</h2>
            <div className="prose max-w-none">
              <h1 className="text-3xl font-bold mb-4 text-gray-800">{formData.title || 'Post Title'}</h1>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Featured image"
                  className="w-full h-64 object-cover rounded-md mb-4"
                  onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x400')}
                />
              )}
              <div className="text-gray-800">
                {formData.body ? (
                  <div
                    className="prose max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: formData.body }}
                  />
                ) : (
                  <p className="text-gray-500 italic">Start typing to see the preview...</p>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Author:</strong> {formData.robottxt_auther_name || 'Author Name'}</p>
                <p><strong>Published:</strong> {formData.robottxt_publish_date || 'Date'}</p>
                <p><strong>Category:</strong> {formData.category || 'Uncategorized'}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}