'use client'; // Required if you're using the Next.js 13+ app directory

import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const Carousel = ({ title, posts }) => {
  const [isMobile, setIsMobile] = useState(false);
  // const router = useRouter();

  useEffect(() => {
    // Only run on client
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCardClick = (post) => {
    // const id = post.id || post.link;
    // if (id) router.push(`/blogpage?id=${encodeURIComponent(id)}`);
  };

  const shouldUseCarousel = isMobile ? posts.length >= 2 : posts.length >= 4;

  const renderCard = (post, idx) => (
    <div
      key={idx}
      onClick={() => handleCardClick(post)}
      className="cursor-pointer w-[300px] bg-white rounded-lg shadow-md p-4 text-center transition-transform duration-200 hover:-translate-y-1"
    >
      <img
        src={post.image_url}
        alt={post.title}
        className="w-full h-40 object-cover rounded mb-2"
      />
      <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
      <p className="text-sm text-gray-500 mb-2">
        {post.robottxt_publish_date} by {post.robottxt_auther_name || 'Unknown'}
      </p>
      <p className="text-sm text-gray-700">{post.robottxt_headline}</p>
    </div>
  );

  return (
    <section className="max-w-6xl mx-auto my-8 px-4">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">{title}</h2>
      {shouldUseCarousel ? (
        <Slider
          dots={true}
          infinite={true}
          speed={500}
          slidesToShow={3}
          slidesToScroll={1}
          arrows={true}
          responsive={[
            { breakpoint: 1024, settings: { slidesToShow: 2 } },
            { breakpoint: 600, settings: { slidesToShow: 1 } },
          ]}
        >
          {posts.map(renderCard)}
        </Slider>
      ) : (
        <div className="flex flex-wrap gap-4">
          {posts.map(renderCard)}
        </div>
      )}
    </section>
  );
};

export default Carousel;
