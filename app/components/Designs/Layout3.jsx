'use client';

import React, { useState } from 'react';
import Carousel from './Carousel';

const TabbedLayout = () => {
  const [activeTab, setActiveTab] = useState('PC Updates');
  const dummyPosts = [
    { id: 1, link: '/BlogList?id=react-hooks', title: 'Understanding React Hooks', category: 'PC Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
    { id: 2, link: '/BlogList?id=es6-basics', title: 'ES6 Features You Should Know', category: 'Technology Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
  ];

  return (
    <section className="py-12" style={{ backgroundColor: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('PC Updates')}
            className={`px-6 py-2 rounded-full font-semibold ${activeTab === 'PC Updates' ? 'text-white' : 'bg-white text-gray-800 hover:bg-blue-100'}`}
            style={{ backgroundColor: activeTab === 'PC Updates' ? '#2563eb' : undefined }}
          >
            PC Updates
          </button>
          <button
            onClick={() => setActiveTab('Technology Updates')}
            className={`px-6 py-2 rounded-full font-semibold ${activeTab === 'Technology Updates' ? 'text-white' : 'bg-white text-gray-800 hover:bg-blue-100'}`}
            style={{ backgroundColor: activeTab === 'Technology Updates' ? '#2563eb' : undefined }}
          >
            Technology Updates
          </button>
        </div>
        {activeTab && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: '#2563eb' }}>
              {activeTab}
            </h2>
            <Carousel title={activeTab} posts={dummyPosts.filter(p => p.category === activeTab)} />
          </div>
        )}
      </div>
    </section>
  );
};

export default TabbedLayout;