'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Globe, FileText, RefreshCw, Tag,
  TrendingUp, Target, CheckCircle2, BookOpen, PenLine,
  AlertCircle, ChevronRight, BarChart3,
} from 'lucide-react';

interface KeywordMaster { _id: string; keyword: string; volume: number; kd: number; cpc: number; trend: string; country: string }
interface GroupDetail {
  _id: string; name: string; description?: string; niche?: string;
  totalVolume: number; avgKD: number; keywordCount: number; priorityScore: number;
  status: string; isUserEdited: boolean; lastClusteredAt?: string;
  website?: { _id: string; name: string; domain: string };
  blogContent?: { _id: string; title: string; status: string; publishedAt?: string };
  primaryKeyword?: { _id: string; keyword: string; volume: number; kd: number };
  keywords: KeywordMaster[];
  aiSuggestions?: {
    blogTitle: string; outline: string[]; targetAudience: string;
    contentType: string; generatedAt: string;
  };
}
interface Website { _id: string; name: string; domain: string }

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [isCreatingBlog, setIsCreatingBlog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchGroup();
    fetch('/api/websites?limit=100&status=active')
      .then((r) => r.json())
      .then((d) => d.success && setWebsites(d.data));
  }, [groupId]);

  const fetchGroup = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/keywords/groups/${groupId}`);
      const data = await res.json();
      if (data.success) {
        setGroup(data.data);
        setEditName(data.data.name);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSuggestion = async () => {
    setIsGeneratingSuggestion(true);
    try {
      const res = await fetch(`/api/keywords/groups/${groupId}/suggest`, { method: 'POST' });
      const data = await res.json();
      if (data.success) fetchGroup();
      else alert(data.error || 'Failed to generate suggestions');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleCreateBlog = async () => {
    if (!group?.website) {
      alert('Assign this group to a website first before creating a blog.');
      return;
    }
    setIsCreatingBlog(true);
    try {
      const res = await fetch(`/api/keywords/groups/${groupId}/blog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: group.aiSuggestions?.blogTitle,
          autoPublish: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchGroup();
      } else {
        alert(data.error || 'Failed to create blog');
      }
    } finally {
      setIsCreatingBlog(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    await fetch(`/api/keywords/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setIsEditing(false);
    fetchGroup();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        Group not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/keywords/groups')} className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold bg-zinc-800 border border-zinc-600 rounded px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <button onClick={handleSaveName} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">Save</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-zinc-300">
                      <PenLine className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {group.niche && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{group.niche}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    group.status === 'published' ? 'bg-emerald-900/30 text-emerald-400' :
                    group.status === 'assigned' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-zinc-800 text-zinc-400'
                  }`}>{group.status}</span>
                  {group.isUserEdited && (
                    <span className="text-xs text-zinc-500">· User edited</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!group.website && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  <Globe className="h-4 w-4" />
                  Assign Website
                </button>
              )}
              {group.status !== 'published' && (
                <button
                  onClick={handleCreateBlog}
                  disabled={isCreatingBlog}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm disabled:opacity-60"
                >
                  {isCreatingBlog ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Create Blog
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left: Keywords List */}
        <div className="col-span-2 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Keywords', value: group.keywordCount, icon: Tag, color: 'purple' },
              { label: 'Total Volume', value: group.totalVolume.toLocaleString(), icon: TrendingUp, color: 'blue' },
              { label: 'Avg KD', value: `${group.avgKD}/100`, icon: Target, color: group.avgKD <= 30 ? 'emerald' : group.avgKD <= 60 ? 'yellow' : 'red' },
              { label: 'Priority Score', value: group.priorityScore, icon: BarChart3, color: 'orange' },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${m.color}-500/20 rounded-lg`}>
                    <m.icon className={`h-4 w-4 text-${m.color}-400`} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">{m.label}</p>
                    <p className="text-lg font-bold">{m.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Keywords Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="font-semibold">Keywords in this Group</h2>
              <span className="text-sm text-zinc-400">{group.keywords.length} keywords</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-800/50 text-left text-sm text-zinc-400">
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3 text-right">Volume</th>
                  <th className="px-4 py-3 text-right">KD</th>
                  <th className="px-4 py-3 text-right">CPC</th>
                  <th className="px-4 py-3">Trend</th>
                  <th className="px-4 py-3">Country</th>
                </tr>
              </thead>
              <tbody>
                {group.keywords.map((kw) => (
                  <tr key={kw._id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">
                      {kw.keyword}
                      {group.primaryKeyword?._id === kw._id && (
                        <span className="ml-2 text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">primary</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{kw.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${kw.kd <= 30 ? 'text-emerald-400' : kw.kd <= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {kw.kd}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">${kw.cpc.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${kw.trend === 'rising' ? 'text-emerald-400' : kw.trend === 'declining' ? 'text-red-400' : 'text-zinc-400'}`}>
                        {kw.trend}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{kw.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: AI Suggestions & Assignment */}
        <div className="space-y-6">
          {/* Website Assignment */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              Website Assignment
            </h3>
            {group.website ? (
              <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-800/40 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{group.website.name}</p>
                  <p className="text-xs text-zinc-400">{group.website.domain}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 mb-3">Not assigned to any website</p>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Assign Website
                </button>
              </div>
            )}
          </div>

          {/* Blog Status */}
          {group.blogContent && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Blog Post
              </h3>
              <div className="flex items-start gap-3 p-3 bg-emerald-900/20 border border-emerald-800/40 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{group.blogContent.title}</p>
                  <p className="text-xs text-zinc-400 capitalize">{group.blogContent.status}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Blog Suggestion */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                AI Blog Suggestion
              </h3>
              <button
                onClick={handleGenerateSuggestion}
                disabled={isGeneratingSuggestion}
                className="text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg flex items-center gap-1"
              >
                {isGeneratingSuggestion ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {group.aiSuggestions ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {group.aiSuggestions ? (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Blog Title</p>
                  <p className="text-sm font-medium">{group.aiSuggestions.blogTitle}</p>
                </div>
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-2">Content Outline</p>
                  <ol className="space-y-1">
                    {group.aiSuggestions.outline.map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-xs text-zinc-500 w-5">{i + 1}.</span>
                        {h}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">
                    <BookOpen className="h-3 w-3 inline mr-1" />
                    {group.aiSuggestions.contentType}
                  </span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-zinc-400 truncate">
                    {group.aiSuggestions.targetAudience}
                  </span>
                </div>
                {group.status !== 'published' && (
                  <button
                    onClick={handleCreateBlog}
                    disabled={isCreatingBlog || !group.website}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {isCreatingBlog ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    Create Blog Post
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-zinc-500 text-sm">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-zinc-700" />
                Click Generate for AI blog topic suggestions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Website Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl m-4 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Assign to Website
            </h2>
            <AssignWebsiteForm
              groupId={groupId}
              websites={websites}
              onClose={() => setShowAssignModal(false)}
              onSuccess={() => { setShowAssignModal(false); fetchGroup(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssignWebsiteForm({
  groupId, websites, onClose, onSuccess,
}: { groupId: string; websites: Website[]; onClose: () => void; onSuccess: () => void }) {
  const [websiteId, setWebsiteId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!websiteId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/keywords/groups/${groupId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      data.success ? onSuccess() : alert(data.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <select
        value={websiteId}
        onChange={(e) => setWebsiteId(e.target.value)}
        className="w-full px-4 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
      >
        <option value="">Select website...</option>
        {websites.map((w) => (
          <option key={w._id} value={w._id}>{w.name} ({w.domain})</option>
        ))}
      </select>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!websiteId || isSaving}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {isSaving ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </div>
  );
}
