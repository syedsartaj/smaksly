'use client';

import { useState } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  MoreVertical,
  FileCode,
  Layout,
  FileText,
  Newspaper,
  Globe,
} from 'lucide-react';
import { useBuilderStore, BuilderPage, BuilderComponent, selectPagesByLanguage, selectLanguages, selectCurrentLanguage } from '@/stores/useBuilderStore';

const PAGE_TYPE_ICONS: Record<string, React.ElementType> = {
  static: FileText,
  dynamic: FileCode,
  'blog-listing': Newspaper,
  'blog-post': Layout,
};

export function FileTree() {
  const {
    pages,
    components,
    currentPage,
    currentComponent,
    setCurrentPage,
    setCurrentComponent,
    addPage,
    deletePage,
    addComponent,
    deleteComponent,
    project,
    setCode,
    setOriginalCode,
    currentLanguage,
    setCurrentLanguage,
  } = useBuilderStore();

  const languages = useBuilderStore(selectLanguages);
  const filteredPages = useBuilderStore(selectPagesByLanguage);
  const hasMultipleLanguages = languages.length > 1;

  const [expandedSections, setExpandedSections] = useState({
    pages: true,
    components: true,
  });
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [newPageType, setNewPageType] = useState<'static' | 'dynamic' | 'blog-listing' | 'blog-post'>('static');
  const [isCreating, setIsCreating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ type: 'page' | 'component'; id: string; x: number; y: number } | null>(null);

  // Component creation state
  const [showNewComponentForm, setShowNewComponentForm] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentType, setNewComponentType] = useState<'layout' | 'section' | 'element' | 'widget'>('layout');
  const [newComponentDescription, setNewComponentDescription] = useState('');
  const [generateWithAI, setGenerateWithAI] = useState(true);
  const [isCreatingComponent, setIsCreatingComponent] = useState(false);

  const toggleSection = (section: 'pages' | 'components') => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Auto-populate name and path based on page type
  const handlePageTypeChange = (type: 'static' | 'dynamic' | 'blog-listing' | 'blog-post') => {
    setNewPageType(type);

    // Auto-fill name and path for blog page types
    if (type === 'blog-listing') {
      if (!newPageName.trim()) setNewPageName('Blog');
      if (!newPagePath.trim()) setNewPagePath('/blog');
    } else if (type === 'blog-post') {
      if (!newPageName.trim()) setNewPageName('Blog Post');
      if (!newPagePath.trim()) setNewPagePath('/blog/[slug]');
    }
  };

  const handleCreatePage = async () => {
    if (!newPageName.trim() || !project) return;

    try {
      setIsCreating(true);

      const path = newPagePath.trim() || `/${newPageName.toLowerCase().replace(/\s+/g, '-')}`;

      const response = await fetch('/api/builder/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project._id,
          name: newPageName.trim(),
          path,
          type: newPageType,
          language: currentLanguage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        addPage(data.data);
        setShowNewPageForm(false);
        setNewPageName('');
        setNewPagePath('');
        setNewPageType('static');
      } else {
        alert(data.error || 'Failed to create page');
      }
    } catch (error) {
      console.error('Error creating page:', error);
      alert('Failed to create page');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateComponent = async () => {
    if (!newComponentName.trim() || !project) return;

    // If generating with AI, require a description
    if (generateWithAI && !newComponentDescription.trim()) {
      alert('Please provide a description for AI generation');
      return;
    }

    try {
      setIsCreatingComponent(true);

      const requestBody: Record<string, unknown> = {
        projectId: project._id,
        name: newComponentName.trim(),
        type: newComponentType,
      };

      if (generateWithAI) {
        requestBody.generateWithAI = true;
        requestBody.aiDescription = newComponentDescription.trim();
      } else {
        requestBody.code = `// ${newComponentName} Component
export default function ${newComponentName}() {
  return (
    <div>
      {/* ${newComponentName} content */}
    </div>
  );
}`;
      }

      const response = await fetch('/api/builder/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // Add component to store and select it
        addComponent(data.data);
        handleSelectComponent(data.data);
        setShowNewComponentForm(false);
        setNewComponentName('');
        setNewComponentDescription('');
      } else {
        alert(data.error || 'Failed to create component');
      }
    } catch (error) {
      console.error('Error creating component:', error);
      alert('Failed to create component');
    } finally {
      setIsCreatingComponent(false);
    }
  };

  const handleSelectComponent = (component: BuilderComponent) => {
    // Clear current page selection and switch to component editing
    setCurrentPage(null);
    setCurrentComponent(component);
    setCode(component.code || '');
    setOriginalCode(component.code || '');
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const response = await fetch(`/api/builder/pages/${pageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        deletePage(pageId);
      } else {
        alert(data.error || 'Failed to delete page');
      }
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page');
    }

    setContextMenu(null);
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      const response = await fetch(`/api/builder/components/${componentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        deleteComponent(componentId);
      } else {
        alert(data.error || 'Failed to delete component');
      }
    } catch (error) {
      console.error('Error deleting component:', error);
      alert('Failed to delete component');
    }

    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'page' | 'component', id: string) => {
    e.preventDefault();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  // Close context menu on click outside
  const handleClickOutside = () => {
    setContextMenu(null);
  };

  return (
    <div
      className="h-full w-full bg-zinc-900 flex flex-col overflow-hidden"
      onClick={handleClickOutside}
    >
      {/* Header */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-3 flex-shrink-0">
        <span className="text-sm font-medium text-zinc-300">Files</span>
      </div>

      {/* Language Selector */}
      {hasMultipleLanguages && (
        <div className="border-b border-zinc-800 px-2 py-1.5 flex items-center gap-1 overflow-x-auto flex-shrink-0">
          <Globe className="h-3 w-3 text-zinc-500 flex-shrink-0" />
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setCurrentLanguage(lang.code)}
              className={`px-2 py-0.5 text-xs rounded transition-colors flex-shrink-0 ${
                currentLanguage === lang.code
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {lang.code.toUpperCase()}
              {lang.direction === 'rtl' && (
                <span className="ml-0.5 text-amber-400 text-[10px]">RTL</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* File Tree Content */}
      <div className="flex-1 overflow-auto py-2">
        {/* Pages Section */}
        <div className="mb-2">
          <div
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div
              className="flex items-center gap-2 flex-1"
              onClick={() => toggleSection('pages')}
            >
              {expandedSections.pages ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              <span>Pages</span>
              <span className="text-xs text-zinc-600">({filteredPages.length})</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewPageForm(true);
              }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Add Page"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {expandedSections.pages && (
            <div className="ml-4 border-l border-zinc-800">
              {filteredPages.map((page: BuilderPage) => {
                const Icon = PAGE_TYPE_ICONS[page.type] || File;
                const isActive = currentPage?._id === page._id;

                return (
                  <button
                    key={page._id}
                    onClick={() => setCurrentPage(page)}
                    onContextMenu={(e) => handleContextMenu(e, 'page', page._id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{page.name}</span>
                    <span className="text-xs text-zinc-600 truncate">{page.path}</span>
                    {page.isHomePage && (
                      <span className="text-xs bg-zinc-700 text-zinc-400 px-1 rounded">Home</span>
                    )}
                  </button>
                );
              })}

              {/* New Page Form */}
              {showNewPageForm && (
                <div className="px-3 py-2 space-y-2 bg-zinc-800/50">
                  <input
                    type="text"
                    placeholder="Page name"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Path (e.g., /about)"
                    value={newPagePath}
                    onChange={(e) => setNewPagePath(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={newPageType}
                    onChange={(e) => handlePageTypeChange(e.target.value as typeof newPageType)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="static">Static Page</option>
                    <option value="dynamic">Dynamic Page</option>
                    <option value="blog-listing">Blog Listing</option>
                    <option value="blog-post">Blog Post Template</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreatePage}
                      disabled={!newPageName.trim() || isCreating}
                      className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewPageForm(false);
                        setNewPageName('');
                        setNewPagePath('');
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Components Section */}
        <div>
          <div className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors cursor-pointer">
            <div
              className="flex items-center gap-2 flex-1"
              onClick={() => toggleSection('components')}
            >
              {expandedSections.components ? (
                <FolderOpen className="h-4 w-4" />
              ) : (
                <Folder className="h-4 w-4" />
              )}
              <span>Components</span>
              <span className="text-xs text-zinc-600">({components.length})</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewComponentForm(true);
              }}
              className="p-1 hover:bg-zinc-700 rounded transition-colors"
              title="Add Component"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {expandedSections.components && (
            <div className="ml-4 border-l border-zinc-800">
              {/* New Component Form */}
              {showNewComponentForm && (
                <div className="px-3 py-2 space-y-2 bg-zinc-800/50">
                  <input
                    type="text"
                    placeholder="Component name (e.g., Header)"
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <select
                    value={newComponentType}
                    onChange={(e) => setNewComponentType(e.target.value as typeof newComponentType)}
                    className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="layout">Layout (Header, Footer, Nav)</option>
                    <option value="section">Section (Hero, Features)</option>
                    <option value="element">Element (Button, Card)</option>
                    <option value="widget">Widget (Newsletter, Social)</option>
                  </select>

                  {/* AI Generation Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={generateWithAI}
                      onChange={(e) => setGenerateWithAI(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-xs text-zinc-400">Generate with AI</span>
                  </label>

                  {/* AI Description */}
                  {generateWithAI && (
                    <textarea
                      placeholder={
                        newComponentType === 'layout' && newComponentName.toLowerCase().includes('header')
                          ? "E.g., Modern sticky header with logo, navigation links (Home, About, Blog, Contact), mobile menu, and a CTA button"
                          : newComponentType === 'layout' && newComponentName.toLowerCase().includes('footer')
                          ? "E.g., Dark footer with company info, quick links, contact details, newsletter signup, and social icons"
                          : "Describe the component you want to create..."
                      }
                      value={newComponentDescription}
                      onChange={(e) => setNewComponentDescription(e.target.value)}
                      rows={3}
                      className="w-full px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateComponent}
                      disabled={!newComponentName.trim() || isCreatingComponent || (generateWithAI && !newComponentDescription.trim())}
                      className={`flex-1 px-2 py-1 text-white text-xs rounded transition-colors disabled:opacity-50 ${
                        generateWithAI
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {isCreatingComponent ? 'Creating...' : generateWithAI ? '✨ Generate' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewComponentForm(false);
                        setNewComponentName('');
                        setNewComponentDescription('');
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {components.length === 0 && !showNewComponentForm ? (
                <div className="px-3 py-2 text-xs text-zinc-600">
                  No components yet
                </div>
              ) : (
                components.map((component: BuilderComponent) => {
                  const isActive = currentComponent?._id === component._id;
                  return (
                    <button
                      key={component._id}
                      onClick={() => handleSelectComponent(component)}
                      onContextMenu={(e) => handleContextMenu(e, 'component', component._id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                      }`}
                    >
                      <FileCode className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{component.name}</span>
                      <span className="text-xs text-zinc-600">{component.type}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => contextMenu.type === 'page'
              ? handleDeletePage(contextMenu.id)
              : handleDeleteComponent(contextMenu.id)
            }
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete {contextMenu.type === 'page' ? 'Page' : 'Component'}
          </button>
        </div>
      )}
    </div>
  );
}
