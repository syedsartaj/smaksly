'use client';

import React from 'react';
import Carousel from './Carousel';

const GridBasedLayout = () => {
  const dummyPosts = [
    { id: 1, link: '/BlogList?id=react-hooks', title: 'Understanding React Hooks', category: 'PC Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
    { id: 2, link: '/BlogList?id=es6-basics', title: 'ES6 Features You Should Know', category: 'Technology Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#2563eb' }}>
            PC Updates
          </h2>
          <Carousel title="PC Updates" posts={dummyPosts.filter(p => p.category === 'PC Updates')} />
        </div>
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
          <h2 className="text-2xl font-semibold mb-4" style={{ color: '#2563eb' }}>
            Technology Updates
          </h2>
          <Carousel title="Technology Updates" posts={dummyPosts.filter(p => p.category === 'Technology Updates')} />
        </div>
      </div>
    </div>
  );
};

export default GridBasedLayout;