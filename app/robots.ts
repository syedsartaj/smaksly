import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://smaksly.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/login', '/signup', '/editor', '/edit-blog', '/partner/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
