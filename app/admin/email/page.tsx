'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail,
  Send,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Star,
  MailOpen,
  ChevronDown,
  ChevronRight,
  X,
  Paperclip,
  Reply,
  Inbox,
  ArrowLeft,
  Circle,
  CheckCircle2,
  AlertCircle,
  Globe,
  Server,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

// ─── Types ───

interface EmailContact {
  name?: string;
  address: string;
}

interface EmailItem {
  _id: string;
  from: EmailContact;
  to: EmailContact[];
  subject: string;
  snippet: string;
  body?: string;
  bodyText?: string;
  isRead: boolean;
  isStarred: boolean;
  direction: 'inbound' | 'outbound';
  receivedAt: string;
  threadId: string;
  messageId?: string;
}

interface EmailAccountItem {
  _id: string;
  email: string;
  displayName: string;
  status: 'active' | 'error' | 'disabled';
  lastSyncAt: string | null;
  errorMessage?: string;
  unreadCount: number;
}

interface WebsiteGroup {
  websiteId: string;
  domain: string;
  websiteName: string;
  accounts: EmailAccountItem[];
}

// ─── Main Page ───

export default function EmailPage() {
  // State
  const [websiteGroups, setWebsiteGroups] = useState<WebsiteGroup[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccountItem | null>(null);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailItem[] | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [expandedWebsites, setExpandedWebsites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState({ accounts: true, emails: false, thread: false, syncing: false });
  const [showCompose, setShowCompose] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading((p) => ({ ...p, accounts: true }));
      const res = await fetch('/api/emails/accounts');
      const json = await res.json();
      if (json.success) {
        setWebsiteGroups(json.data);
        // Auto-expand all, auto-select first account
        const ids = new Set<string>(json.data.map((g: WebsiteGroup) => g.websiteId));
        setExpandedWebsites(ids);
        if (!selectedAccount && json.data.length > 0 && json.data[0].accounts.length > 0) {
          setSelectedAccount(json.data[0].accounts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading((p) => ({ ...p, accounts: false }));
    }
  }, []);

  // Fetch emails for selected account
  const fetchEmails = useCallback(async (accountId: string, page = 1, search = '') => {
    try {
      setLoading((p) => ({ ...p, emails: true }));
      const params = new URLSearchParams({
        accountId,
        folder,
        page: page.toString(),
        limit: '50',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/emails?${params}`);
      const json = await res.json();
      if (json.success) {
        setEmails(json.data);
        setTotalPages(json.pagination.totalPages);
        setCurrentPage(json.pagination.page);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setLoading((p) => ({ ...p, emails: false }));
    }
  }, [folder]);

  // Fetch thread
  const fetchThread = useCallback(async (threadId: string) => {
    try {
      setLoading((p) => ({ ...p, thread: true }));
      const res = await fetch(`/api/emails/thread/${encodeURIComponent(threadId)}`);
      const json = await res.json();
      if (json.success) {
        setSelectedThread(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    } finally {
      setLoading((p) => ({ ...p, thread: false }));
    }
  }, []);

  // Sync emails
  const handleSync = async () => {
    try {
      setLoading((p) => ({ ...p, syncing: true }));
      const body = selectedAccount ? { accountId: selectedAccount._id } : {};
      await fetch('/api/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (selectedAccount) {
        await fetchEmails(selectedAccount._id, currentPage, searchQuery);
      }
      await fetchAccounts();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setLoading((p) => ({ ...p, syncing: false }));
    }
  };

  // Mark read/unread
  const toggleRead = async (emailId: string, isRead: boolean) => {
    await fetch(`/api/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: !isRead }),
    });
    setEmails((prev) => prev.map((e) => (e._id === emailId ? { ...e, isRead: !isRead } : e)));
  };

  // Toggle star
  const toggleStar = async (emailId: string, isStarred: boolean) => {
    await fetch(`/api/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred: !isStarred }),
    });
    setEmails((prev) => prev.map((e) => (e._id === emailId ? { ...e, isStarred: !isStarred } : e)));
  };

  // Delete email (move to trash)
  const deleteEmail = async (emailId: string) => {
    await fetch(`/api/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: 'trash' }),
    });
    setEmails((prev) => prev.filter((e) => e._id !== emailId));
    if (selectedEmail?._id === emailId) {
      setSelectedEmail(null);
      setSelectedThread(null);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (selectedAccount) {
      fetchEmails(selectedAccount._id, 1, searchQuery);
      setSelectedEmail(null);
      setSelectedThread(null);
    }
  }, [selectedAccount, folder]);

  // Debounced search
  useEffect(() => {
    if (!selectedAccount) return;
    const timer = setTimeout(() => {
      fetchEmails(selectedAccount._id, 1, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEmailClick = (email: EmailItem) => {
    setSelectedEmail(email);
    fetchThread(email.threadId);
    if (!email.isRead) {
      toggleRead(email._id, false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top bar */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-semibold text-white">Email</h1>
          {selectedAccount && (
            <span className="text-sm text-zinc-500 ml-2">{selectedAccount.email}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={loading.syncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading.syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <Send className="h-4 w-4" />
            Compose
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar: Accounts ─── */}
        <div className="w-60 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-zinc-800">
            <button
              onClick={() => setShowAddAccount(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          </div>

          {/* Folder tabs */}
          <div className="flex border-b border-zinc-800">
            {(['inbox', 'sent', 'trash'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                  folder === f
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading.accounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
              </div>
            ) : websiteGroups.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Mail className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No email accounts</p>
                <p className="text-xs text-zinc-600 mt-1">Add an account to get started</p>
              </div>
            ) : (
              websiteGroups.map((group) => (
                <div key={group.websiteId} className="mb-1">
                  <button
                    onClick={() => {
                      setExpandedWebsites((prev) => {
                        const next = new Set(prev);
                        next.has(group.websiteId) ? next.delete(group.websiteId) : next.add(group.websiteId);
                        return next;
                      });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {expandedWebsites.has(group.websiteId) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <Globe className="h-3 w-3 text-zinc-600" />
                    <span className="truncate">{group.domain}</span>
                  </button>
                  {expandedWebsites.has(group.websiteId) && (
                    <div className="ml-4">
                      {group.accounts.map((acc) => (
                        <button
                          key={acc._id}
                          onClick={() => setSelectedAccount(acc)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                            selectedAccount?._id === acc._id
                              ? 'bg-zinc-800 text-emerald-400'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                          }`}
                        >
                          {acc.status === 'active' ? (
                            <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400 shrink-0" />
                          ) : acc.status === 'error' ? (
                            <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                          ) : (
                            <Circle className="h-2 w-2 fill-zinc-600 text-zinc-600 shrink-0" />
                          )}
                          <span className="truncate text-xs">{acc.email}</span>
                          {acc.unreadCount > 0 && (
                            <span className="ml-auto text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                              {acc.unreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Middle Panel: Email List ─── */}
        <div className="w-96 border-r border-zinc-800 flex flex-col shrink-0">
          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {loading.emails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
              </div>
            ) : !selectedAccount ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <Inbox className="h-10 w-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">Select an email account</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <MailOpen className="h-10 w-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-500">No emails in {folder}</p>
              </div>
            ) : (
              emails.map((email) => (
                <button
                  key={email._id}
                  onClick={() => handleEmailClick(email)}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${
                    selectedEmail?._id === email._id
                      ? 'bg-zinc-800/80'
                      : email.isRead
                        ? 'hover:bg-zinc-900'
                        : 'bg-zinc-900/50 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                      {!email.isRead && (
                        <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(email._id, email.isStarred);
                        }}
                        className="p-0.5"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            email.isStarred
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-700 hover:text-zinc-500'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            email.isRead ? 'text-zinc-400' : 'text-white font-medium'
                          }`}
                        >
                          {email.direction === 'outbound'
                            ? `To: ${email.to?.[0]?.address || 'unknown'}`
                            : email.from?.name || email.from?.address || 'Unknown'}
                        </span>
                        <span className="text-[11px] text-zinc-600 ml-2 shrink-0">
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate ${
                          email.isRead ? 'text-zinc-500' : 'text-zinc-300'
                        }`}
                      >
                        {email.subject}
                      </p>
                      <p className="text-xs text-zinc-600 truncate mt-0.5">
                        {email.snippet}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500">
              <button
                disabled={currentPage <= 1}
                onClick={() => selectedAccount && fetchEmails(selectedAccount._id, currentPage - 1, searchQuery)}
                className="hover:text-white disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => selectedAccount && fetchEmails(selectedAccount._id, currentPage + 1, searchQuery)}
                className="hover:text-white disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* ─── Right Panel: Thread Viewer ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading.thread ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
          ) : !selectedThread || !selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Mail className="h-7 w-7 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm">Select an email to view</p>
              <p className="text-zinc-600 text-xs mt-1">Choose from the inbox on the left</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => {
                      setSelectedEmail(null);
                      setSelectedThread(null);
                    }}
                    className="md:hidden p-1 text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-lg font-medium text-white truncate flex-1">
                    {selectedEmail.subject}
                  </h2>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    <button
                      onClick={() => toggleRead(selectedEmail._id, selectedEmail.isRead)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title={selectedEmail.isRead ? 'Mark unread' : 'Mark read'}
                    >
                      {selectedEmail.isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteEmail(selectedEmail._id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-zinc-600">
                  {selectedThread.length} message{selectedThread.length !== 1 ? 's' : ''} in thread
                </p>
              </div>

              {/* Thread messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {selectedThread.map((msg) => (
                  <ThreadMessage key={msg._id} message={msg} />
                ))}
              </div>

              {/* Reply box */}
              {selectedAccount && selectedEmail && (
                <ReplyBox
                  accountId={selectedAccount._id}
                  inReplyTo={selectedEmail.messageId || ''}
                  threadId={selectedEmail.threadId}
                  toAddress={
                    selectedEmail.direction === 'inbound'
                      ? selectedEmail.from.address
                      : selectedEmail.to?.[0]?.address || ''
                  }
                  subject={
                    selectedEmail.subject.startsWith('Re:')
                      ? selectedEmail.subject
                      : `Re: ${selectedEmail.subject}`
                  }
                  onSent={() => fetchThread(selectedEmail.threadId)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          accounts={websiteGroups.flatMap((g) => g.accounts)}
          defaultAccountId={selectedAccount?._id}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            if (selectedAccount) fetchEmails(selectedAccount._id, currentPage, searchQuery);
          }}
        />
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onAdded={() => {
            setShowAddAccount(false);
            fetchAccounts();
          }}
        />
      )}
    </div>
  );
}

// ─── Thread Message Component ───

function ThreadMessage({ message }: { message: EmailItem }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-xs text-zinc-400 font-medium">
              {(message.from?.name || message.from?.address || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">
              {message.from?.name || message.from?.address}
            </p>
            <p className="text-xs text-zinc-600 truncate">
              {message.direction === 'outbound' ? `To: ${message.to?.[0]?.address}` : message.from?.address}
            </p>
          </div>
        </div>
        <span className="text-xs text-zinc-600 shrink-0 ml-4">
          {new Date(message.receivedAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/50">
          <div
            className="prose prose-invert prose-sm max-w-none mt-3 text-zinc-300 [&_a]:text-emerald-400 [&_img]:max-w-full [&_img]:rounded"
            dangerouslySetInnerHTML={{ __html: message.body || message.bodyText || message.snippet }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Reply Box ───

function ReplyBox({
  accountId,
  inReplyTo,
  threadId,
  toAddress,
  subject,
  onSent,
}: {
  accountId: string;
  inReplyTo: string;
  threadId: string;
  toAddress: string;
  subject: string;
  onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          to: [toAddress],
          subject,
          body: body.replace(/\n/g, '<br>'),
          bodyText: body,
          inReplyTo,
          threadId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBody('');
        onSent();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-zinc-800 px-6 py-3 shrink-0">
      <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500">
        <Reply className="h-3 w-3" />
        <span>Reply to {toAddress}</span>
      </div>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your reply..."
          rows={3}
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
          }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="self-end px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-[10px] text-zinc-700 mt-1">Ctrl+Enter to send</p>
    </div>
  );
}

// ─── Compose Modal ───

function ComposeModal({
  accounts,
  defaultAccountId,
  onClose,
  onSent,
}: {
  accounts: EmailAccountItem[];
  defaultAccountId?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [fromAccountId, setFromAccountId] = useState(defaultAccountId || accounts[0]?._id || '');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: fromAccountId,
          to: to.split(',').map((e) => e.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
          subject,
          body: body.replace(/\n/g, '<br>'),
          bodyText: body,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSent();
      }
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-white">New Email</h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-3 space-y-2 border-b border-zinc-800">
          {/* From */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 w-12 shrink-0">From</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            >
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.displayName ? `${acc.displayName} <${acc.email}>` : acc.email}
                </option>
              ))}
            </select>
          </div>

          {/* To */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 w-12 shrink-0">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            {!showCc && (
              <button onClick={() => setShowCc(true)} className="text-xs text-zinc-500 hover:text-zinc-300">
                Cc
              </button>
            )}
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500 w-12 shrink-0">Cc</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 w-12 shrink-0">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-hidden">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email..."
            className="w-full h-full min-h-[200px] bg-transparent text-sm text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-600">Ctrl+Enter to send</div>
          <button
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || !body.trim() || sending}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Account Modal ───

const EMAIL_PRESETS = {
  zoho: {
    label: 'Zoho Mail',
    imapHost: 'imap.zoho.com', imapPort: '993',
    smtpHost: 'smtp.zoho.com', smtpPort: '587',
    separateSmtpAuth: false,
    hint: 'Use your Zoho email as username. Requires Zoho Mail paid plan for IMAP access.',
  },
  'cloudflare-brevo': {
    label: 'Cloudflare + Brevo',
    imapHost: 'imap.gmail.com', imapPort: '993',
    smtpHost: 'smtp-relay.brevo.com', smtpPort: '587',
    separateSmtpAuth: true,
    hint: 'IMAP: Use Gmail (where Cloudflare forwards). SMTP: Use Brevo SMTP key for sending.',
  },
  gmail: {
    label: 'Gmail / Google Workspace',
    imapHost: 'imap.gmail.com', imapPort: '993',
    smtpHost: 'smtp.gmail.com', smtpPort: '587',
    separateSmtpAuth: false,
    hint: 'Use your Gmail address as username. Requires App Password if 2FA is enabled.',
  },
  outlook: {
    label: 'Outlook / Microsoft 365',
    imapHost: 'outlook.office365.com', imapPort: '993',
    smtpHost: 'smtp.office365.com', smtpPort: '587',
    separateSmtpAuth: false,
    hint: 'Use your full email as username.',
  },
  custom: {
    label: 'Custom Provider',
    imapHost: '', imapPort: '993',
    smtpHost: '', smtpPort: '587',
    separateSmtpAuth: false,
    hint: 'Enter your email provider IMAP/SMTP details manually.',
  },
} as const;

type PresetKey = keyof typeof EMAIL_PRESETS;

function AddAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [preset, setPreset] = useState<PresetKey>('zoho');
  const [separateSmtp, setSeparateSmtp] = useState(false);
  const [form, setForm] = useState({
    websiteId: '',
    email: '',
    displayName: '',
    imapHost: EMAIL_PRESETS.zoho.imapHost,
    imapPort: EMAIL_PRESETS.zoho.imapPort,
    smtpHost: EMAIL_PRESETS.zoho.smtpHost,
    smtpPort: EMAIL_PRESETS.zoho.smtpPort,
    username: '',
    password: '',
    smtpUsername: '',
    smtpPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [websites, setWebsites] = useState<Array<{ _id: string; domain: string; name?: string }>>([]);

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
      .then((json) => {
        if (json.success || json.data) {
          setWebsites(json.data || []);
          if (json.data?.length > 0) {
            setForm((f) => ({ ...f, websiteId: json.data[0]._id }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const applyPreset = (key: PresetKey) => {
    const p = EMAIL_PRESETS[key];
    setPreset(key);
    setSeparateSmtp(p.separateSmtpAuth);
    setForm((f) => ({
      ...f,
      imapHost: p.imapHost,
      imapPort: p.imapPort,
      smtpHost: p.smtpHost,
      smtpPort: p.smtpPort,
      smtpUsername: '',
      smtpPassword: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        ...form,
        imapPort: parseInt(form.imapPort, 10),
        smtpPort: parseInt(form.smtpPort, 10),
      };
      // Only send separate SMTP creds if enabled and filled
      if (!separateSmtp || !form.smtpUsername) {
        delete payload.smtpUsername;
        delete payload.smtpPassword;
      }

      const res = await fetch('/api/emails/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        onAdded();
      } else {
        setError(json.error || 'Failed to add account');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const currentPreset = EMAIL_PRESETS[preset];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            Add Email Account
          </h3>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Provider Preset */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Email Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(EMAIL_PRESETS) as [PresetKey, typeof EMAIL_PRESETS[PresetKey]][]).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                    preset === key
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">{currentPreset.hint}</p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Website</label>
            <select
              value={form.websiteId}
              onChange={(e) => updateField('websiteId', e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="">Select website...</option>
              {websites.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.domain || w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email & Display Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="admin@yourdomain.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="Admin"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* IMAP */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">IMAP Settings (Incoming)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  value={form.imapHost}
                  onChange={(e) => updateField('imapHost', e.target.value)}
                  placeholder="imap.example.com"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={form.imapPort}
                  onChange={(e) => updateField('imapPort', e.target.value)}
                  placeholder="993"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* SMTP */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Send className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">SMTP Settings (Outgoing)</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <input
                  type="text"
                  value={form.smtpHost}
                  onChange={(e) => updateField('smtpHost', e.target.value)}
                  placeholder="smtp.example.com"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={form.smtpPort}
                  onChange={(e) => updateField('smtpPort', e.target.value)}
                  placeholder="587"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* IMAP Auth */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">
                {separateSmtp ? 'IMAP Authentication' : 'Authentication'}
              </span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder={preset === 'cloudflare-brevo' ? 'Gmail address (where Cloudflare forwards)' : 'Username (usually the email address)'}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder={preset === 'cloudflare-brevo' ? 'Gmail App Password' : 'Password or App Password'}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Separate SMTP Auth Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={separateSmtp}
                onChange={(e) => setSeparateSmtp(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-zinc-400">Use different credentials for SMTP (sending)</span>
            </label>
          </div>

          {/* SMTP Auth (separate) */}
          {separateSmtp && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">SMTP Authentication</span>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.smtpUsername}
                  onChange={(e) => updateField('smtpUsername', e.target.value)}
                  placeholder={preset === 'cloudflare-brevo' ? 'Brevo account email' : 'SMTP username'}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                />
                <div className="relative">
                  <input
                    type={showSmtpPassword ? 'text' : 'password'}
                    value={form.smtpPassword}
                    onChange={(e) => updateField('smtpPassword', e.target.value)}
                    placeholder={preset === 'cloudflare-brevo' ? 'Brevo SMTP key' : 'SMTP password'}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
