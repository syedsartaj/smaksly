'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';

const websiteSchema = z.object({
  name: z.string().min(1, 'Website name is required').max(100),
  domain: z.string().min(1, 'Domain is required').regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
  niche: z.string().min(1, 'Niche is required'),
  categoryId: z.string().optional(), // Made optional - will use default category
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']),

  // SEO Metrics
  da: z.number().min(0).max(100),
  dr: z.number().min(0).max(100),
  traffic: z.number().min(0),

  // Guest Post Settings
  acceptsGuestPosts: z.boolean(),
  guestPostPrice: z.number().min(0),
  doFollow: z.boolean(),
  turnaroundDays: z.number().min(1).max(90),
  maxLinksPerPost: z.number().min(1).max(10),
  minWordCount: z.number().min(100).max(5000),
  maxWordCount: z.number().min(100).max(10000),
  contentGuidelines: z.string().optional(),

  // Location
  country: z.string(),
  language: z.string(),
});

type WebsiteFormData = z.infer<typeof websiteSchema>;

interface Category {
  _id: string;
  name: string;
  slug: string;
  level: number;
  path: string;
}

const defaultValues: WebsiteFormData = {
  name: '',
  domain: '',
  niche: '',
  categoryId: '',
  description: '',
  status: 'pending',
  da: 0,
  dr: 0,
  traffic: 0,
  acceptsGuestPosts: false,
  guestPostPrice: 0,
  doFollow: true,
  turnaroundDays: 7,
  maxLinksPerPost: 2,
  minWordCount: 500,
  maxWordCount: 2000,
  contentGuidelines: '',
  country: 'US',
  language: 'en',
};

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editId?: string;
}

export function AddWebsiteModal({ isOpen, onClose, onSuccess, editId }: AddWebsiteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WebsiteFormData>({
    resolver: zodResolver(websiteSchema),
    defaultValues,
  });

  const acceptsGuestPosts = watch('acceptsGuestPosts');

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch website data if editing
  useEffect(() => {
    if (isOpen && editId) {
      setIsLoadingData(true);
      fetch(`/api/websites/${editId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            const website = data.data;
            reset({
              name: website.name || '',
              domain: website.domain || '',
              niche: website.niche || '',
              categoryId: website.categoryId || '',
              description: website.description || '',
              status: website.status || 'pending',
              da: website.da || 0,
              dr: website.dr || 0,
              traffic: website.traffic || 0,
              acceptsGuestPosts: website.acceptsGuestPosts || false,
              guestPostPrice: (website.guestPostPrice || 0) / 100, // Convert from cents
              doFollow: website.doFollow !== false,
              turnaroundDays: website.turnaroundDays || 7,
              maxLinksPerPost: website.maxLinksPerPost || 2,
              minWordCount: website.minWordCount || 500,
              maxWordCount: website.maxWordCount || 2000,
              contentGuidelines: website.contentGuidelines || '',
              country: website.country || 'US',
              language: website.language || 'en',
            });
          }
        })
        .catch((err) => {
          console.error('Failed to fetch website:', err);
          setError('Failed to load website data');
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else if (isOpen && !editId) {
      reset(defaultValues);
      setError(null);
    }
  }, [isOpen, editId, reset]);

  const onSubmit = async (data: WebsiteFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = editId ? `/api/websites/${editId}` : '/api/websites';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          guestPostPrice: Math.round(data.guestPostPrice * 100), // Convert to cents
        }),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save website');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            {editId ? 'Edit Website' : 'Add New Website'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-300">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Website Name *
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="My Website"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Domain *
                  </label>
                  <input
                    {...register('domain')}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="example.com"
                  />
                  {errors.domain && (
                    <p className="mt-1 text-sm text-red-400">{errors.domain.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Niche *
                  </label>
                  <input
                    {...register('niche')}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Technology"
                  />
                  {errors.niche && (
                    <p className="mt-1 text-sm text-red-400">{errors.niche.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Category
                  </label>
                  <select
                    {...register('categoryId')}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">General (default)</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {'  '.repeat(cat.level)}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Country
                    </label>
                    <input
                      {...register('country')}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="US"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Language
                    </label>
                    <input
                      {...register('language')}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="en"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Brief description of the website..."
                />
              </div>
            </div>

            {/* SEO Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">SEO Metrics</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Domain Authority (DA)
                  </label>
                  <input
                    type="number"
                    {...register('da', { valueAsNumber: true })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Domain Rating (DR)
                  </label>
                  <input
                    type="number"
                    {...register('dr', { valueAsNumber: true })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min={0}
                    max={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Monthly Traffic
                  </label>
                  <input
                    type="number"
                    {...register('traffic', { valueAsNumber: true })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Guest Post Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Guest Post Settings</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('acceptsGuestPosts')}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-400">Accept Guest Posts</span>
                </label>
              </div>

              {acceptsGuestPosts && (
                <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Price (USD)
                      </label>
                      <input
                        type="number"
                        {...register('guestPostPrice', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={0}
                        step={0.01}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Turnaround (days)
                      </label>
                      <input
                        type="number"
                        {...register('turnaroundDays', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={1}
                        max={90}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Max Links
                      </label>
                      <input
                        type="number"
                        {...register('maxLinksPerPost', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={1}
                        max={10}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Min Word Count
                      </label>
                      <input
                        type="number"
                        {...register('minWordCount', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={100}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">
                        Max Word Count
                      </label>
                      <input
                        type="number"
                        {...register('maxWordCount', { valueAsNumber: true })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={100}
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register('doFollow')}
                          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-zinc-400">DoFollow Links</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Content Guidelines
                    </label>
                    <textarea
                      {...register('contentGuidelines')}
                      rows={3}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Specific requirements for guest posts..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editId ? 'Update Website' : 'Add Website'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
