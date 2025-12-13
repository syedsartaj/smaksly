'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Header1 from '../components/Designs/Header1';
import Header2 from '../components/Designs/Header2';
import Header3 from '../components/Designs/Header3';

import Footer1 from '../components/Designs/Footer1';
import Footer2 from '../components/Designs/Footer2';
import Footer3 from '../components/Designs/Footer3';

import Layout1 from '../components/Designs/Layout1';
import Layout2 from '../components/Designs/Layout2';
import Layout3 from '../components/Designs/Layout3';

import BlogLayout1 from '../components/Designs/BlogLayout1';
import BlogLayout2 from '../components/Designs/BlogLayout2';
import BlogLayout3 from '../components/Designs/BlogLayout3';

import Hero1 from '../components/Designs/Hero1';
import Hero2 from '../components/Designs/Hero2';
import Hero3 from '../components/Designs/Hero3';

const range = [1, 2, 3, 4, 5];

const headerComponents: Record<number, React.ReactNode> = {
  1: <Header1 />,
  2: <Header2 />,
  3: <Header3 />,
};

const footerComponents: Record<number, React.ReactNode> = {
  1: <Footer1 />,
  2: <Footer2 />,
  3: <Footer3 />,
};

const layoutComponents: Record<number, React.ReactNode> = {
  1: <Layout1 />,
  2: <Layout2 />,
  3: <Layout3 />,
};

const blogComponents: Record<number, React.ReactNode> = {
  1: <BlogLayout1 />,
  2: <BlogLayout2 />,
  3: <BlogLayout3 />,
};

const heroComponents: Record<number, React.ReactNode> = {
  1: <Hero1 />,
  2: <Hero2 />,
  3: <Hero3 />,
};

export default function FullEditor() {
  const [preview, setPreview] = useState<{ type: string; id: number | null }>({ type: '', id: null });
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOpen, setIsOpen] = useState<Record<string, boolean>>({});
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [rightPanelData, setRightPanelData] = useState({
    Heading: '',
    Subheading: '',
    ButtonText: '',
    companyName: '',
    companySlogan: '',
    body_aboutus: '', body_contactus: '', body_privacy_policy: '',body_privacypolicy:'',emailid:'',
  });
  const searchParams = useSearchParams();
  const spreadsheetId = searchParams.get('smaksly_id');
  console.log(spreadsheetId);
  const updateSheet = async (key: string, value: any) => {
    console.log('Sending config update', rightPanelData);
    if (!spreadsheetId) return;
    const isConfig = typeof value === 'object' && value !== null && !Array.isArray(value);
    if (isConfig) setLoadingConfig(true);
    else setLoading(true);
    try {
      const response = await fetch('/api/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: spreadsheetId, key, value }),
      });
      if (!response.ok) throw new Error('Update failed');
      const data = await response.json();
      console.log(`✅ Updated ${key} to`, value, data);
    } catch (err) {
      console.error(`❌ Error updating ${key}:`, err);
    } finally {
      if (isConfig) setLoadingConfig(false);
      else setLoading(false);
    }
  };

  const sections = [
    { label: 'Header', key: 'Header', components: headerComponents },
    { label: 'Footer', key: 'Footer', components: footerComponents },
    { label: 'Layout', key: 'layoutType', components: layoutComponents },
    { label: 'BlogList', key: 'Hero', components: blogComponents },
    { label: 'Hero', key: 'Hero', components: heroComponents },
  ];

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const toggleRightSidebar = () => setIsRightSidebarOpen((prev) => !prev);

  const isRightPanelComplete = Object.values(rightPanelData).every((value) => value.trim() !== '');

  return (
    <div className="flex h-screen">
      {/* Left Panel (Sidebar) */}
      <aside
        className={`bg-gradient-to-b from-[#1A1B1E] to-[#141517] h-screen p-4 text-sm transition-all duration-300 ${
          isSidebarOpen ? 'w-56' : 'w-16'
        } border-r border-b-[0.1px] border-[#6e6e6e] shadow-[0_2px_4px_0_rgba(0,0,0,0.1)]`}
        aria-label="Sidebar navigation"
      >
        <div className="flex justify-between items-center mb-6">
          {isSidebarOpen ? (
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
              </svg>
              <span className="font-bold text-white text-lg" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
                Smaksly
              </span>
            </div>
          ) : (
            <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
            </svg>
          )}
          <button
            onClick={toggleSidebar}
            className="text-[#E4E4E7] hover:text-white focus:outline-none p-1 rounded"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
        {isSidebarOpen && (
          <div className="space-y-6">
            {sections.map(({ label, key, components }) => (
              <div key={label} className="space-y-4">
                <span className="text-white px-4 py-3 text-base font-medium" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
                  {label} Selection
                </span>
                <div className="relative">
                  <button
                    className="w-full p-3 pl-4 pr-10 rounded-lg bg-gradient-to-b from-[#1A1B1E] to-[#141517] text-[#E4E4E7] shadow-sm flex items-center justify-between hover:bg-[#2A2B2D] transition duration-200 cursor-pointer"
                    onClick={() => setIsOpen((prev) => ({ ...prev, [label]: !prev[label] || false }))}
                  >
                    <span style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {preview.type === label ? `${label} ${preview.id || ''}` : `Select ${label}`}
                    </span>
                    <span className="pointer-events-none">
                      <svg
                        className="w-5 h-5 text-[#E4E4E7]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </button>
                  <ul
                    className={`absolute w-full mt-1 bg-gradient-to-b from-[#1A1B1E] to-[#141517] border-2 border-[#6e6e6e] rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
                      isOpen[label] ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    <li
                      className="p-2 text-[#E4E4E7] cursor-default"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      onClick={() => {
                        setPreview({ type: label, id: null });
                        setIsOpen((prev) => ({ ...prev, [label]: false }));
                      }}
                    >
                      Select {label}
                    </li>
                    {range.map((num) => (
                      <li
                        key={num}
                        className="p-2 text-[#E4E4E7] hover:bg-[#2A2B2D] cursor-pointer"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                        onClick={() => {
                          setPreview({ type: label, id: num });
                          setIsOpen((prev) => ({ ...prev, [label]: false }));
                          updateSheet(key, num);
                        }}
                      >
                        {label} {num}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Center Preview Panel */}
      <div className="flex-1 flex flex-col h-screen p-6 overflow-y-auto bg-[#1f1d1d] text-white px-4 py-3 text-base font-medium border-b-[0.1px] border-[#6e6e6e] shadow-[0_2px_4px_0_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>Preview</h2>
          <button
            disabled={preview.type === '' || preview.id === null || loading}
            className="bg-[#2A2B2D] hover:bg-[#3A3B3D] text-white text-sm py-2 px-4 rounded-lg disabled:opacity-50 transition duration-200 md:w-auto w-full"
            onClick={() => {
              const key = sections.find((s) => s.label === preview.type)?.key;
              if (key && preview.id !== null) updateSheet(key, preview.id);
            }}
          >
            Apply
          </button>
        </div>
        <div className="flex-1 min-h-0 border rounded shadow p-4 border-[0.1px] border-[#6e6e6e] bg-[#424242]">
          {preview.type && preview.id
            ? sections.find((s) => s.label === preview.type)?.components[preview.id] || <p>Invalid selection.</p>
            : <p>No selection made.</p>}
        </div>
      </div>

      {/* Right Panel (Sidebar) */}
      <aside
        className={`bg-gradient-to-b from-[#1A1B1E] to-[#141517] h-screen p-4 text-sm transition-all duration-300 ${
          isRightSidebarOpen ? 'w-56' : 'w-16'
        } border-l border-b-[0.1px] border-[#6e6e6e] shadow-[0_2px_4px_0_rgba(0,0,0,0.1)]`}
        aria-label="Right sidebar navigation"
      >
        <div className="flex justify-between items-center mb-6">
          {isRightSidebarOpen ? (
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
              </svg>
              <span className="font-bold text-white text-lg" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
                Config
              </span>
            </div>
          ) : (
            <svg className="w-6 h-6 text-[#E4E4E7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M5 19L19 5" />
            </svg>
          )}
          <button
            onClick={toggleRightSidebar}
            className="text-[#E4E4E7] hover:text-white focus:outline-none p-1 rounded"
            aria-label={isRightSidebarOpen ? 'Close right sidebar' : 'Open right sidebar'}
            aria-expanded={isRightSidebarOpen}
          >
            {isRightSidebarOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>
        {isRightSidebarOpen && (
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="text-white px-4 py-3 text-base font-medium" style={{ fontFamily: 'Josefin Sans, sans-serif' }}>
                Configuration
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={rightPanelData.Heading}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, Heading: e.target.value }))}
                  placeholder="Heading"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <input
                  type="text"
                  value={rightPanelData.Subheading}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, Subheading: e.target.value }))}
                  placeholder="Subheading"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <input
                  type="text"
                  value={rightPanelData.ButtonText}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, ButtonText: e.target.value }))}
                  placeholder="Button Text"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <input
                  type="text"
                  value={rightPanelData.companyName}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Company Name"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <input
                  type="text"
                  value={rightPanelData.companySlogan}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, companySlogan: e.target.value }))}
                  placeholder="Company Slogan"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <textarea
                  value={rightPanelData.body_aboutus}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, body_aboutus: e.target.value }))}
                  placeholder="About Us Body"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <textarea
                  value={rightPanelData.body_contactus}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, body_contactus: e.target.value }))}
                  placeholder="Contact Us Body"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <textarea
                  value={rightPanelData.body_privacy_policy}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, body_privacy_policy: e.target.value }))}
                  placeholder="Privacy Policy Body"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <textarea
                  value={rightPanelData.body_privacypolicy}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, body_privacypolicy: e.target.value }))}
                  placeholder="Privacy Policy Body"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <textarea
                  value={rightPanelData.emailid}
                  onChange={(e) => setRightPanelData((prev) => ({ ...prev, emailid: e.target.value }))}
                  placeholder="Custom email id"
                  className="w-full p-2 rounded-lg bg-[#2A2B2D] text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#3A3B3D]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
                <button
                  disabled={!isRightPanelComplete || loadingConfig}
                  className="w-full bg-[#2A2B2D] hover:bg-[#3A3B3D] text-white text-sm py-2 px-4 rounded-lg disabled:opacity-50 transition duration-200"
                  onClick={() => updateSheet('config', rightPanelData)}
                >
                  Apply Config
                </button>
              </div>
            </div>

          </div>
        )}
      </aside>
    </div>
  );
}