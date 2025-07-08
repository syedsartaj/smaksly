'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react'; // For modal
import { Fragment } from 'react';

export default function EditBlog() {
  const searchParams = useSearchParams();
  const spreadsheetId = searchParams.get('spreadsheetId');

  const [blogs, setBlogs] = useState([]); // State for all blogs
  const [selectedBlog, setSelectedBlog] = useState(null); // State for selected blog
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    robottxt_headline: '',
    robottxt_publish_date: '',
    robottxt_auther_name: '',
    image_url: '',
  });

  // Fetch all blogs
  useEffect(() => {
    const fetchAllBlogs = async () => {
      try {
        const res = await fetch(`/api/read-sheet${spreadsheetId ? `?spreadsheetId=${spreadsheetId}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch blogs');
        const data = await res.json();
        // Assuming data.sheet1 contains an array of blog rows
        setBlogs(data.sheet1 || []);
        console.log(data.sheet1);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      }
    };
    fetchAllBlogs();
  }, [spreadsheetId]);

  const handleDelete = async (id: string) => {
  if (!spreadsheetId) {
    alert('❌ Error: Spreadsheet ID is missing');
    return;
  }

  const confirm = window.confirm('Are you sure you want to delete this blog?');
  if (!confirm) return;

  try {
    const res = await fetch('/api/delete-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spreadsheetId,
        id,
      }),
    });

    if (res.ok) {
      alert('✅ Blog deleted successfully!');
      setBlogs((prev: any) => prev.filter((blog: any) => blog.id !== id));
    } else {
      const errorData = await res.json();
      alert(`❌ Error: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error deleting blog:', error);
    alert('❌ Delete failed');
  }
};

  // Handle opening the modal and setting form data
  const handleEditClick = (blog :any) => {
    setSelectedBlog(blog);
    setFormData({
      id: blog.id || '',
      title: blog.title || '',
      robottxt_headline: blog.robottxt_headline || '',
      robottxt_publish_date: blog.robottxt_publish_date || '',
      robottxt_auther_name: blog.robottxt_auther_name || '',
      image_url: blog.image_url || '',
    });
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleChange = (e:any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle blog update
  const handleUpdate = async () => {
    try {
      // Validate required fields
  if (!spreadsheetId) {
    alert('❌ Error: Spreadsheet ID is missing');
    return;
  }
  if (!formData.id) {
    alert('❌ Error: Blog ID is missing');
    return;
  }
  if (!formData.title || !formData.robottxt_headline || !formData.robottxt_publish_date || !formData.robottxt_auther_name || !formData.image_url) {
    alert('❌ Error: All form fields must be filled');
    return;
  }
      const res = await fetch('/api/update-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId,
          id: formData.id,
          updates: {
            title: formData.title,
            robottxt_headline: formData.robottxt_headline,
            robottxt_publish_date: formData.robottxt_publish_date,
            robottxt_auther_name: formData.robottxt_auther_name,
            image_url: formData.image_url,
          },
        }),
      });

      if (res.ok) {
        alert('✅ Blog updated successfully!');
        // Update the blogs list with the updated data
        const updatedData = await res.json();
        setBlogs((prev:any) =>
          prev.map((blog:any) =>
            blog.id === formData.id ? { ...blog, ...updatedData.updatedRow } : blog
          )
        );
        setIsModalOpen(false); // Close the modal
      } else {
        const errorData = await res.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      alert('❌ Update failed');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-800 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Manage Blogs</h1>

      {/* Blog List */}
      {blogs.length > 0 ? (
        <div className="space-y-4">
          {blogs.map((blog : any) => (
            <div
              key={blog.id}
              className="flex justify-between items-center p-4 bg-gray-700 rounded-lg"
            >
              <div>
                <h2 className="text-lg font-semibold">{blog.title}</h2>
                <p className="text-sm text-gray-300">{blog.robottxt_headline}</p>
                <p className="text-sm text-gray-400">By {blog.robottxt_auther_name}</p>
              </div>
              <button
                onClick={() => handleEditClick(blog)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors duration-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(blog.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center">Loading blogs...</p>
      )}

      {/* Edit Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-gray-800 text-white p-6 align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-bold mb-4">
                    Edit Blog - {formData.title}
                  </Dialog.Title>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium">ID</label>
                      <input
                        type="text"
                        name="id"
                        value={formData.id}
                        onChange={handleChange}
                        disabled
                        className="w-full p-2 bg-gray-700 text-white rounded disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Headline</label>
                      <input
                        type="text"
                        name="robottxt_headline"
                        value={formData.robottxt_headline}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Publish Date</label>
                      <input
                        type="text"
                        name="robottxt_publish_date"
                        value={formData.robottxt_publish_date}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Author</label>
                      <input
                        type="text"
                        name="robottxt_auther_name"
                        value={formData.robottxt_auther_name}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-700 text-white rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Image URL</label>
                      <input
                        type="text"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-700 text-white rounded"
                      />
                    </div>
                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdate}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors duration-200"
                      >
                        Update
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}