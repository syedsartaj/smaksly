'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';

// Generate IST formatted date-time: "YYYY-MM-DD HH:mm:ss"
function getCurrentISTDateTime() {
  const date = new Date();
  const offset = 5.5 * 60 * 60 * 1000; // IST offset in ms
  const ist = new Date(date.getTime() + offset);
  return ist.toISOString().replace('T', ' ').slice(0, 19);
}

// Generate slug from title
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // replace special characters and spaces with hyphens
    .replace(/^-+|-+$/g, '')     // remove leading/trailing hyphens
    .replace(/-+/g, '-');        // collapse multiple hyphens
}

export default function PostForm() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('smaksly_id');
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [keyword, setKeyword] = useState('');
  const [formData, setFormData] = useState({
    title: '', image_url: '',
    robottxt_publish_date: '', robottxt_modify_date: '',
    category: '', body: '', slug: ''
  });
  const [status, setStatus] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Initialize IST dates on first load
  useEffect(() => {
    const now = getCurrentISTDateTime();
    setFormData(prev => ({
      ...prev,
      robottxt_publish_date: now,
      robottxt_modify_date: now
    }));
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    setStatus('Uploading image...');
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formDataUpload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setFormData(prev => ({ ...prev, image_url: data.secure_url }));
      setStatus('✅ Image uploaded');
    } catch (err) {
      console.error(err);
      setStatus('❌ Image upload failed');
    }
  };

  // Auto-update slug and modify_date on title/body change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedFields: any = { [name]: value };

    if (name === 'title') {
      updatedFields.slug = generateSlug(value);
    }

    if (['title', 'body'].includes(name)) {
      updatedFields.robottxt_modify_date = getCurrentISTDateTime();
    }

    setFormData(prev => ({ ...prev, ...updatedFields }));
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

      const title = data.title || '';
      const slug = generateSlug(title);
      const now = getCurrentISTDateTime();

      // Remove asterisk symbols from body, if present
      const cleanBody = (data.body || '').replace(/\*/g, '');

      setFormData(prev => ({
        ...prev,
        ...data,
        body: cleanBody,
        slug,
        robottxt_publish_date: prev.robottxt_publish_date || now,
        robottxt_modify_date: now
      }));

      setStatus('✅ Generated from AI');
    } catch (err) {
      setStatus(`❌ Failed to generate: ${err}`);
    }
  };

  const handleAddLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !linkUrl || !previewRef.current) {
      setStatus('❌ Please select text in the preview and enter a valid URL');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (!selectedText) {
      setStatus('❌ Please select some text in the preview');
      return;
    }

    try {
      // Create a new anchor element
      const formattedUrl = /^(http|https):\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;

      const link = document.createElement('a');
      link.href = formattedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = formattedUrl; // Show URL on hover
      link.textContent = selectedText;
      link.className = 'text-blue-600 hover:underline'; // Style for visibility

      // Replace the selected range with the anchor element
      range.deleteContents();
      range.insertNode(link);

      // Update formData.body with the new HTML content
      const newBody = previewRef.current.innerHTML;
      setFormData(prev => ({
        ...prev,
        body: newBody,
        robottxt_modify_date: getCurrentISTDateTime()
      }));

      setLinkUrl('');
      setStatus('✅ Link added to selected text');
      selection.removeAllRanges();
    } catch (err) {
      setStatus(`❌ Failed to add link: ${err}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");

    const res = await fetch('/api/add-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, ...formData }),
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
          <div className="w-1/2 bg-[#1f1d1d]">
            <h1 className="text-2xl font-bold mb-6 text-white">📝 Create New Post</h1>

            {/* Keyword + Generate */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Enter keyword"
                name="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md"
              />
              <button
                type="button"
                onClick={generateWithAI}
                className="mt-2 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Generate With AI
              </button>
            </div>
            <div className="flex flex-col mb-4">
              <label className="text-sm font-medium mb-1 text-gray-300">Upload a custom Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-2 bg-[#2d2c2c] text-white border border-gray-600 rounded_MD"
              />
            </div>

            {/* Slug (Read-only) */}
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-green-400">Slug (auto-generated) if need changes change in title</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                readOnly
                className="w-full p-3 bg-[#2d2c2c] text-green-400 border border-gray-600 rounded-md"
              />
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {Object.keys(formData).map((field) =>
                field === 'slug' ? null : (
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
                        className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md resize-y"
                        placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={field}
                        value={formData[field as keyof typeof formData]}
                        onChange={handleChange}
                        className="w-full p-3 bg-[#2d2c2c] text-white border border-gray-600 rounded-md"
                        placeholder={`Enter ${field.replace(/_/g, ' ')}...`}
                      />
                    )}
                  </div>
                )
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Publish
              </button>
            </form>

            {status && <p className="mt-4 text-green-400">{status}</p>}
          </div>

          {/* Live Preview */}
          <div className="w-1/2 bg-gray-100 p-6 rounded-md shadow-lg overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Live Preview</h2>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 text-gray-800">Add Link to Selected Text</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Enter link URL (e.g., https://example.com)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="bg-blue-600aliases text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Add Link
                </button>
              </div>
            </div>
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
                    ref={previewRef}
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className="prose max-w-none text-gray-800 focus:outline-none"
                    dangerouslySetInnerHTML={{ __html: formData.body }}
                    onInput={(e) => {
                      if (previewRef.current) {
                        setFormData(prev => ({
                          ...prev,
                          body: previewRef.current!.innerHTML,
                          robottxt_modify_date: getCurrentISTDateTime()
                        }));
                      }
                    }}
                  />
                ) : (
                  <p className="text-gray-500 italic">Start typing to see the preview...</p>
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Published:</strong> {formData.robottxt_publish_date || 'Date'}</p>
                <p><strong>Modified:</strong> {formData.robottxt_modify_date || 'Date'}</p>
                <p><strong>Category:</strong> {formData.category || 'Uncategorized'}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}