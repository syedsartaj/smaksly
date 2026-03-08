'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Palette, Type, FileText, Search, MapPin, Globe, Building2 } from 'lucide-react';

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Raleway',
];

const COLOR_PRESETS = [
  { primary: '#10b981', secondary: '#06b6d4', name: 'Emerald & Cyan' },
  { primary: '#3b82f6', secondary: '#8b5cf6', name: 'Blue & Purple' },
  { primary: '#f59e0b', secondary: '#ef4444', name: 'Amber & Red' },
  { primary: '#ec4899', secondary: '#f97316', name: 'Pink & Orange' },
  { primary: '#14b8a6', secondary: '#22c55e', name: 'Teal & Green' },
  { primary: '#6366f1', secondary: '#a855f7', name: 'Indigo & Violet' },
];

export default function NewBuilderProjectPage() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#06b6d4');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [blogEnabled, setBlogEnabled] = useState(true);

  // SEO Config
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('US');
  const [region, setRegion] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [schemaType, setSchemaType] = useState<string>('WebSite');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch('/api/builder/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim(),
          settings: {
            primaryColor,
            secondaryColor,
            fontFamily,
            siteName: siteName.trim() || projectName.trim(),
            siteDescription: siteDescription.trim(),
            seoConfig: {
              niche: niche.trim() || undefined,
              country,
              region: region.trim() || undefined,
              targetKeywords: targetKeywords.trim() ? targetKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
              schemaType,
              businessName: businessName.trim() || undefined,
              businessAddress: businessAddress.trim() || undefined,
              businessPhone: businessPhone.trim() || undefined,
              businessEmail: businessEmail.trim() || undefined,
              generateSitemap: true,
              generateRobotsTxt: true,
            },
          },
          blogConfig: {
            enabled: blogEnabled,
            postsPerPage: 9,
            layout: 'grid',
            showCategories: true,
            showTags: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/admin/builder/${data.data._id}`);
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push('/admin/builder')}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create New Project</h1>
          <p className="text-zinc-400 mt-1">
            Set up a new AI-powered website project
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Details */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Project Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Awesome Website"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Brief description of the website..."
                rows={3}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Site Name (shown in header/footer)
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="My Website"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Site Description (for SEO)
              </label>
              <textarea
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="A short description for search engines..."
                rows={2}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Design Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Design Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Color Presets */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Color Preset
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                    }}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                      primaryColor === preset.primary && secondaryColor === preset.secondary
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                    title={preset.name}
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 text-center truncate w-full">
                      {preset.name.split(' & ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Type className="h-4 w-4 text-zinc-400" />
                <label className="text-sm font-medium text-zinc-300">Font Family</label>
              </div>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SEO Configuration */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-white">SEO Configuration</h2>
              <p className="text-sm text-zinc-400">Help AI build SEO-optimized pages</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Niche & Schema Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Globe className="h-3.5 w-3.5 inline mr-1.5" />Industry / Niche
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. Restaurant, SaaS, E-commerce"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Building2 className="h-3.5 w-3.5 inline mr-1.5" />Schema Type
                </label>
                <select
                  value={schemaType}
                  onChange={(e) => setSchemaType(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="WebSite">Website (General)</option>
                  <option value="LocalBusiness">Local Business</option>
                  <option value="Organization">Organization</option>
                  <option value="Product">Product</option>
                  <option value="Blog">Blog</option>
                  <option value="Person">Person / Portfolio</option>
                </select>
              </div>
            </div>

            {/* Country & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <MapPin className="h-3.5 w-3.5 inline mr-1.5" />Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AE">UAE</option>
                  <option value="SA">Saudi Arabia</option>
                  <option value="IN">India</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  City / Region
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Dubai, New York, London"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Target Keywords */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Target Keywords
              </label>
              <input
                type="text"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                placeholder="web design, digital marketing, SEO services (comma separated)"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-zinc-600 mt-1">AI will optimize headings and content around these keywords</p>
            </div>

            {/* Business Info (shown for LocalBusiness / Organization) */}
            {(schemaType === 'LocalBusiness' || schemaType === 'Organization') && (
              <div className="border-t border-zinc-800 pt-4 mt-4 space-y-4">
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Business Details (for Schema.org)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Phone</label>
                    <input
                      type="text"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="+1 555-123-4567"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="info@example.com"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Address</label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Blog Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold text-white">Blog Integration</h2>
                <p className="text-sm text-zinc-400">
                  Enable dynamic blog content from your Smaksly database
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={blogEnabled}
                onChange={(e) => setBlogEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/builder')}
            className="px-6 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
