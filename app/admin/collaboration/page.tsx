'use client';

import { useEffect, useState } from 'react';


import { motion, AnimatePresence } from 'framer-motion';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar: string;
  status: 'active' | 'pending';
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  sentAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export default function CollaborationPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'You',
      email: '',
      role: 'admin',
      avatar: '',
      status: 'active',
      joinedAt: new Date().toISOString(),
    },
  ]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setTeamMembers((prev) =>
        prev.map((m, i) =>
          i === 0 ? { ...m, email, name: email.split('@')[0], avatar: email.charAt(0).toUpperCase() } : m
        )
      );
    }
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newInvitation: Invitation = {
        id: Math.random().toString(36).substr(2, 9),
        email: inviteEmail,
        role: inviteRole,
        sentAt: new Date().toISOString(),
        status: 'pending',
      };

      setInvitations((prev) => [...prev, newInvitation]);
      setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      setInviteEmail('');
      setTimeout(() => setShowInviteModal(false), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    setMessage({ type: 'success', text: 'Team member removed' });
  };

  const handleCancelInvitation = (id: string) => {
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    setMessage({ type: 'success', text: 'Invitation cancelled' });
  };

  const roleColors = {
    admin: 'bg-purple-500/20 text-purple-400',
    editor: 'bg-blue-500/20 text-blue-400',
    viewer: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
      <main className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Team Collaboration</h1>
              <p className="text-gray-400">Manage your team members and permissions</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite Member
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Team Members', value: teamMembers.length, icon: '👥', color: 'from-blue-500 to-cyan-500' },
              { label: 'Pending Invites', value: invitations.filter((i) => i.status === 'pending').length, icon: '📨', color: 'from-purple-500 to-pink-500' },
              { label: 'Editors', value: teamMembers.filter((m) => m.role === 'editor').length, icon: '✏️', color: 'from-green-500 to-emerald-500' },
              { label: 'Viewers', value: teamMembers.filter((m) => m.role === 'viewer').length, icon: '👁️', color: 'from-orange-500 to-yellow-500' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl`}>
                    {stat.icon}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Team Members */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Team Members</h2>
            <div className="space-y-3">
              {teamMembers.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-4 hover:border-[#9929EA]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#9929EA] to-[#6C63FF] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {member.avatar || member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-medium flex items-center gap-2">
                          {member.name}
                          {member.id === '1' && (
                            <span className="text-xs text-gray-400">(You)</span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[member.role]}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      {member.id !== '1' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Pending Invitations</h2>
              <div className="space-y-3">
                {invitations.map((invitation, idx) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#2d2a4a] rounded-full flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">{invitation.email}</p>
                          <p className="text-gray-400 text-sm">
                            Sent {new Date(invitation.sentAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[invitation.role]}`}>
                          {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                        </span>
                        <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                          Pending
                        </span>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Roles Info */}
          <div className="mt-8 bg-[#1C1936]/30 border border-[#2d2a4a] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  role: 'Admin',
                  icon: '👑',
                  permissions: ['Full access', 'Manage team', 'Billing access', 'Delete projects'],
                },
                {
                  role: 'Editor',
                  icon: '✏️',
                  permissions: ['Create content', 'Edit deployments', 'View analytics', 'Cannot delete'],
                },
                {
                  role: 'Viewer',
                  icon: '👁️',
                  permissions: ['View projects', 'View analytics', 'Cannot edit', 'Read-only access'],
                },
              ].map((item) => (
                <div key={item.role} className="bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{item.icon}</span>
                    <h4 className="text-white font-medium">{item.role}</h4>
                  </div>
                  <ul className="space-y-1">
                    {item.permissions.map((perm, i) => (
                      <li key={i} className="text-gray-400 text-sm flex items-center gap-2">
                        <span className="w-1 h-1 bg-[#9929EA] rounded-full"></span>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </main>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C1936] border border-[#2d2a4a] rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Invite Team Member</h2>
              <p className="text-gray-400 text-sm mb-6">Send an invitation to collaborate on your projects</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                    className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                  >
                    <option value="editor">Editor - Can create and edit content</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>

                {message.text && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-3 bg-[#2d2a4a] text-white rounded-xl font-medium hover:bg-[#3d3a5a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
