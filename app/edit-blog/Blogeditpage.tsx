'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

function getCurrentISTDateTime() {
  const date = new Date();
  const istOffset = 330 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  return istTime.toISOString().slice(0, 16).replace('T', ' ');
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export default function EditBlog() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('smaksly_id'); // Previously 'smaksly_id'

  const [blogs, setBlogs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    image_url: '',
    robottxt_publish_date: '',
    robottxt_modify_date: '',
    category: '',
    body: '',
    slug: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      if (!domain) return console.log("domain not found");

      try {
        const res = await fetch('/api/fetch-blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain }),
        });
        const data = await res.json();
        setBlogs(data || []);
        console.log(data);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      }
    };
    fetchBlogs();
  }, [domain]);

  const handleEditClick = (blog: any) => {
    setFormData({
      id: blog.id || '',
      title: blog.title || '',
      image_url: blog.image_url || '',
      robottxt_publish_date: blog.publish_date || '',
      robottxt_modify_date: getCurrentISTDateTime(),
      category: blog.category || '',
      body: blog.body || '',
      slug: blog.slug || '',
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && { slug: generateSlug(value) }),
    }));
  };

  const handleUpdate = async () => {
    if (!domain || !formData.id) {
      alert('❌ Error: Missing domain or blog ID');
      return;
    }

    const res = await fetch('/api/update-blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        id: formData.id,
        updates: {
          ...formData,
          modify_date: getCurrentISTDateTime(),
        },
      }),
    });

    if (res.ok) {
      alert('✅ Blog updated successfully!');
      const updatedData = await res.json();
      setBlogs(prev =>
        prev.map(blog => blog.id === formData.id ? { ...blog, ...updatedData.updatedBlog } : blog)
      );
      setIsModalOpen(false);
    } else {
      const errorData = await res.json();
      alert(`❌ Error: ${errorData.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!domain) return alert('❌ Domain missing');

    const confirmed = window.confirm('Are you sure you want to delete this blog?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/delete-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, id }),
      });

      if (res.ok) {
        alert('✅ Blog deleted');
        setBlogs(prev => prev.filter(blog => blog.id !== id));
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (err) {
      alert('❌ Error deleting blog');
      console.error(err);
    }
  };

  const optimizeWithAI = async () => {
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: formData.title }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI optimization failed');

      const cleanBody = (data.body || '').replace(/\*/g, '');
      const now = getCurrentISTDateTime();

      setFormData(prev => ({
        ...prev,
        ...data,
        body: cleanBody,
        slug: generateSlug(data.title),
        robottxt_modify_date: now,
      }));
      alert('✅ Optimized with AI');
    } catch (err) {
      console.error('AI optimization failed:', err);
      alert(`❌ Optimization failed: ${err}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Manage Blogs</h1>

      {blogs.length > 0 ? (
        <div className="space-y-4">
          {blogs.map((blog: any) => (
            <div key={blog.id} className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">{blog.title}</h2>
                <p className="text-sm text-gray-400">Slug: {blog.slug}</p>
                <p className="text-sm text-gray-400">Category: {blog.category}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEditClick(blog)} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                  Edit
                </button>
                <button onClick={() => handleDelete(blog.id)} className="bg-red-600 px-4 py-2 rounded hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Loading blogs...</p>
      )}

      {/* Modal for Edit Form */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100">
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
<Dialog.Panel className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl text-white max-h-[90vh] overflow-y-auto p-6">
                <Dialog.Title className="text-xl font-bold mb-4">Edit Blog</Dialog.Title>
                <form className="space-y-4">
                  <input disabled value={formData.id} className="w-full p-2 bg-gray-700 rounded" placeholder="ID" />
                  <input name="title" value={formData.title} onChange={handleChange} className="w-full p-2 bg-gray-700 rounded" placeholder="Title" />
                  <input name="slug" value={formData.slug} disabled className="w-full p-2 bg-gray-700 rounded opacity-60 cursor-not-allowed" placeholder="Slug" />
                  <input name="image_url" value={formData.image_url} onChange={handleChange} className="w-full p-2 bg-gray-700 rounded" placeholder="Image URL" />
                  <input disabled value={formData.robottxt_publish_date} className="w-full p-2 bg-gray-700 rounded" placeholder="Publish Date" />
                  <input disabled value={formData.robottxt_modify_date} className="w-full p-2 bg-gray-700 rounded" placeholder="Modify Date" />
                  <input name="category" value={formData.category} onChange={handleChange} className="w-full p-2 bg-gray-700 rounded" placeholder="Category" />
                  <textarea name="body" value={formData.body} onChange={handleChange} rows={4} className="w-full p-2 bg-gray-700 rounded" placeholder="Body" />
                  <div className="flex justify-between space-x-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-600 px-4 py-2 rounded">Cancel</button>
                    <button type="button" onClick={optimizeWithAI} className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600">Optimize With AI</button>
                    <button type="button" onClick={handleUpdate} className="bg-green-600 px-4 py-2 rounded">Update</button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
