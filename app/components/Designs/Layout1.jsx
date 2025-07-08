'use client';

import React from 'react';
import Carousel from './Carousel';

const VerticalStackedLayout = () => {
  const dummyPosts = [
    { id: 1, link: '/BlogList?id=react-hooks', title: 'Understanding React Hooks', category: 'PC Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
    { id: 2, link: '/BlogList?id=es6-basics', title: 'ES6 Features You Should Know', category: 'Technology Updates', image_url: 'https://i.postimg.cc/g03h3n2B/img.jpg' },
  ];

  return (
    <>
      <section className="py-12" style={{ backgroundColor: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6" style={{ color: '#2563eb' }}>
            PC Updates
          </h2>
          <Carousel title="PC Updates" posts={dummyPosts.filter(p => p.category === 'PC Updates')} />
        </div>
      </section>
      <section className="py-12" style={{ backgroundColor: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6" style={{ color: '#2563eb' }}>
            Technology Updates
          </h2>
          <Carousel title="Technology Updates" posts={dummyPosts.filter(p => p.category === 'Technology Updates')} />
        </div>
      </section>
    </>
  );
};

export default VerticalStackedLayout;