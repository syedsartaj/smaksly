'use client';

import { useEffect, useState } from 'react';


import { motion } from 'framer-motion';

interface UserSettings {
  email: string;
  displayName: string;
  notifications: {
    email: boolean;
    deployments: boolean;
    analytics: boolean;
  };
  theme: 'dark' | 'light' | 'system';
  timezone: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    email: '',
    displayName: '',
    notifications: {
      email: true,
      deployments: true,
      analytics: false,
    },
    theme: 'dark',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setSettings((prev) => ({
        ...prev,
        email,
        displayName: email.split('@')[0],
      }));
    }
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Simulate saving settings
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password' });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'api', label: 'API Keys', icon: '🔑' },
  ];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#0C0A1F] via-[#1a1830] to-[#0C0A1F]">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your account preferences and configuration</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tabs Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white'
                        : 'text-gray-300 hover:bg-[#2d2a4a]'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#1C1936]/50 backdrop-blur-sm border border-[#2d2a4a] rounded-xl p-6"
              >
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Profile Settings</h2>

                    <div className="flex items-center gap-6 mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#9929EA] to-[#6C63FF] rounded-full flex items-center justify-center text-3xl text-white font-bold">
                        {settings.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{settings.displayName}</h3>
                        <p className="text-gray-400 text-sm">{settings.email}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                        <input
                          type="text"
                          value={settings.displayName}
                          onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                        <input
                          type="email"
                          value={settings.email}
                          disabled
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-gray-500 text-xs mt-1">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Paris (CET)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Asia/Kolkata">India (IST)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Notification Preferences</h2>

                    {[
                      { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                      { key: 'deployments', label: 'Deployment Alerts', desc: 'Get notified when deployments complete' },
                      { key: 'analytics', label: 'Weekly Analytics', desc: 'Receive weekly performance reports' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl"
                      >
                        <div>
                          <h3 className="text-white font-medium">{item.label}</h3>
                          <p className="text-gray-400 text-sm">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                notifications: {
                                  ...settings.notifications,
                                  [item.key]: e.target.checked,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#2d2a4a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9929EA]"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                          placeholder="Enter current password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                          placeholder="Enter new password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9929EA]"
                          placeholder="Confirm new password"
                        />
                      </div>

                      <button
                        onClick={handlePasswordChange}
                        disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword}
                        className="px-6 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>

                    <div className="pt-6 border-t border-[#2d2a4a]">
                      <h3 className="text-white font-medium mb-4">Active Sessions</h3>
                      <div className="p-4 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white font-medium">Current Session</p>
                            <p className="text-gray-400 text-sm">Active now</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Appearance</h2>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-4">Theme</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'dark', label: 'Dark', icon: '🌙' },
                          { id: 'light', label: 'Light', icon: '☀️' },
                          { id: 'system', label: 'System', icon: '💻' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setSettings({ ...settings, theme: theme.id as 'dark' | 'light' | 'system' })}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              settings.theme === theme.id
                                ? 'border-[#9929EA] bg-[#9929EA]/10'
                                : 'border-[#2d2a4a] hover:border-[#9929EA]/50'
                            }`}
                          >
                            <span className="text-2xl block mb-2">{theme.icon}</span>
                            <span className="text-white font-medium">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* API Keys Tab */}
                {activeTab === 'api' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white mb-4">API Keys</h2>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-yellow-500 font-medium">Keep your API keys secure</p>
                          <p className="text-yellow-500/70 text-sm">Never share your API keys publicly or commit them to version control.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { name: 'Vercel Token', key: 'VERCEL_TOKEN', masked: '****...K0HzHjm' },
                        { name: 'GitHub Token', key: 'GITHUB_TOKEN', masked: '****...aoK0HzHjm' },
                        { name: 'OpenAI API Key', key: 'OPENAI_API_KEY', masked: '****...IcRy8A' },
                      ].map((apiKey) => (
                        <div
                          key={apiKey.key}
                          className="p-4 bg-[#0C0A1F] border border-[#2d2a4a] rounded-xl"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-white font-medium">{apiKey.name}</h3>
                              <code className="text-gray-400 text-sm">{apiKey.masked}</code>
                            </div>
                            <button className="px-3 py-1 bg-[#2d2a4a] text-gray-300 rounded-lg text-sm hover:bg-[#3d3a5a] transition-colors">
                              Regenerate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save Button and Message */}
                {message.text && (
                  <div className={`mt-6 p-3 rounded-lg text-sm ${
                    message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {message.text}
                  </div>
                )}

                {['profile', 'notifications', 'appearance'].includes(activeTab) && (
                  <div className="mt-6 pt-6 border-t border-[#2d2a4a]">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="px-6 py-3 bg-gradient-to-r from-[#9929EA] to-[#6C63FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
    </div>
  );
}
