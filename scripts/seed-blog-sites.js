/**
 * Seed script: Create 9 WordPress-style blog child websites
 *
 * Usage: node scripts/seed-blog-sites.js
 *
 * Requires MONGODB_URI env var (or uses default from .env)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import template generators
const { generateHomePage, generateAboutPage } = require('./templates/wp-home-about');
const { generateBlogListingPage, generateBlogPostPage } = require('./templates/wp-blog');
const { generateContactPage, generateHeaderComponent, generateFooterComponent } = require('./templates/wp-components-contact');

// ─── 9 Blog Site Configurations ────────────────────────────────────────────────
const SITES = [
  {
    name: 'TechPulse',
    tagline: 'Decoding the Digital World',
    niche: 'Technology',
    tw: 'blue',
    description: 'Your go-to source for the latest in technology, gadgets, software reviews, and digital innovation.',
    topics: ['Artificial Intelligence', 'Gadgets & Hardware', 'Software Reviews', 'Startups & Innovation'],
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
  },
  {
    name: 'VitalLife',
    tagline: 'Wellness Starts Here',
    niche: 'Health & Wellness',
    tw: 'emerald',
    description: 'Evidence-based health tips, wellness guides, nutrition advice, and mental health resources for a balanced life.',
    topics: ['Nutrition & Diet', 'Mental Health', 'Fitness Tips', 'Natural Remedies'],
    primaryColor: '#10b981',
    secondaryColor: '#059669',
  },
  {
    name: 'Wanderlust Diaries',
    tagline: 'Stories From Every Corner',
    niche: 'Travel & Adventure',
    tw: 'amber',
    description: 'Travel guides, destination reviews, budget tips, and adventure stories from around the globe.',
    topics: ['Destination Guides', 'Budget Travel', 'Adventure Sports', 'Travel Photography'],
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
  },
  {
    name: 'FlavorFusion',
    tagline: 'Where Taste Meets Creativity',
    niche: 'Food & Recipes',
    tw: 'red',
    description: 'Delicious recipes, cooking techniques, restaurant reviews, and food culture from around the world.',
    topics: ['Quick Recipes', 'Baking & Desserts', 'World Cuisine', 'Healthy Cooking'],
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
  },
  {
    name: 'MoneyWise',
    tagline: 'Smart Finance for Everyone',
    niche: 'Personal Finance',
    tw: 'violet',
    description: 'Practical financial advice, investing strategies, budgeting tips, and wealth-building guides.',
    topics: ['Investing Basics', 'Budgeting & Saving', 'Side Hustles', 'Retirement Planning'],
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
  },
  {
    name: 'StyleHaven',
    tagline: 'Your Daily Dose of Style',
    niche: 'Fashion & Lifestyle',
    tw: 'pink',
    description: 'Fashion trends, style guides, beauty tips, and lifestyle inspiration for the modern individual.',
    topics: ['Fashion Trends', 'Beauty & Skincare', 'Home Decor', 'Lifestyle Tips'],
    primaryColor: '#ec4899',
    secondaryColor: '#db2777',
  },
  {
    name: 'MindGrow',
    tagline: 'Learn Something New Every Day',
    niche: 'Education & Learning',
    tw: 'cyan',
    description: 'Educational resources, study tips, online learning guides, and personal development content.',
    topics: ['Online Courses', 'Study Techniques', 'Career Development', 'Book Reviews'],
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
  },
  {
    name: 'GreenNest',
    tagline: 'Cultivate Your Perfect Space',
    niche: 'Home & Garden',
    tw: 'green',
    description: 'Home improvement ideas, gardening tips, DIY projects, and sustainable living guides.',
    topics: ['Indoor Plants', 'DIY Projects', 'Garden Design', 'Sustainable Living'],
    primaryColor: '#22c55e',
    secondaryColor: '#16a34a',
  },
  {
    name: 'FitForge',
    tagline: 'Forge Your Best Self',
    niche: 'Fitness & Sports',
    tw: 'orange',
    description: 'Workout routines, sports news, nutrition for athletes, and fitness motivation.',
    topics: ['Workout Routines', 'Sports News', 'Nutrition for Athletes', 'Recovery & Rest'],
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
  },
];

// ─── Mongoose Schemas (inline to avoid import issues) ──────────────────────────

const WebsiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: String,
  customDomain: String,
  niche: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: String,
  tags: [String],
  status: { type: String, enum: ['active', 'inactive', 'pending', 'suspended'], default: 'active' },
  da: Number,
  dr: Number,
  traffic: Number,
  country: String,
  language: String,
  currency: String,
  vercelId: String,
  vercelProjectName: String,
  gitRepo: String,
}, { timestamps: true });

const BuilderProjectSchema = new mongoose.Schema({
  websiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
  name: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'building', 'ready', 'published', 'error'], default: 'draft' },
  framework: { type: String, default: 'nextjs' },
  settings: {
    primaryColor: String,
    secondaryColor: String,
    fontFamily: String,
    siteName: String,
    siteDescription: String,
    logo: String,
    favicon: String,
    branding: mongoose.Schema.Types.Mixed,
    seoMetadata: mongoose.Schema.Types.Mixed,
    seoConfig: mongoose.Schema.Types.Mixed,
    languages: [mongoose.Schema.Types.Mixed],
    defaultLanguage: String,
    socialLinks: mongoose.Schema.Types.Mixed,
  },
  blogConfig: {
    enabled: Boolean,
    postsPerPage: Number,
    layout: String,
    showCategories: Boolean,
    showTags: Boolean,
    showAuthor: Boolean,
    showDate: Boolean,
    showReadTime: Boolean,
  },
  gitRepoUrl: String,
  gitRepoName: String,
  vercelProjectId: String,
  deploymentUrl: String,
  lastDeployedAt: Date,
  lastCommitHash: String,
  lastCommitMessage: String,
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const BuilderPageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProject', required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, enum: ['static', 'dynamic', 'blog-listing', 'blog-post'], default: 'static' },
  isHomePage: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  code: String,
  cssModules: String,
  aiPrompt: String,
  aiConversation: [mongoose.Schema.Types.Mixed],
  status: { type: String, enum: ['draft', 'generated', 'edited', 'published'], default: 'generated' },
  lastGeneratedAt: Date,
  metaTitle: String,
  metaDescription: String,
  ogImage: String,
  versions: [mongoose.Schema.Types.Mixed],
  order: Number,
}, { timestamps: true });

const BuilderComponentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuilderProject', required: true },
  name: { type: String, required: true },
  displayName: String,
  description: String,
  type: { type: String, enum: ['layout', 'section', 'element', 'widget'], default: 'layout' },
  scope: { type: String, enum: ['global', 'page-specific'], default: 'global' },
  code: String,
  propsInterface: String,
  exportPath: String,
  aiPrompt: String,
  usedInPages: [mongoose.Schema.Types.ObjectId],
  defaultProps: mongoose.Schema.Types.Mixed,
  previewImage: String,
}, { timestamps: true });

// Use existing models or create new ones
const Website = mongoose.models.Website || mongoose.model('Website', WebsiteSchema);
const BuilderProject = mongoose.models.BuilderProject || mongoose.model('BuilderProject', BuilderProjectSchema);
const BuilderPage = mongoose.models.BuilderPage || mongoose.model('BuilderPage', BuilderPageSchema);
const BuilderComponent = mongoose.models.BuilderComponent || mongoose.model('BuilderComponent', BuilderComponentSchema);

// ─── Find or create "Blog Sites" category ──────────────────────────────────────

async function getOrCreateCategory() {
  const CategorySchema = new mongoose.Schema({
    name: String,
    slug: String,
    description: String,
    type: String,
  }, { timestamps: true });
  const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

  let cat = await Category.findOne({ slug: 'blog-sites' });
  if (!cat) {
    cat = await Category.create({
      name: 'Blog Sites',
      slug: 'blog-sites',
      description: 'WordPress-style blog websites',
      type: 'website',
    });
    console.log('  Created category: Blog Sites');
  }
  return cat._id;
}

// ─── Create a single blog site ─────────────────────────────────────────────────

async function createBlogSite(site, categoryId) {
  const domainSlug = site.name.toLowerCase().replace(/\s+/g, '-');

  // Check if already exists
  const existing = await Website.findOne({ name: site.name });
  if (existing) {
    console.log(`  ⏭  ${site.name} already exists, skipping...`);
    return null;
  }

  // 1. Create Website
  const website = await Website.create({
    name: site.name,
    domain: `${domainSlug}.smaksly.com`,
    niche: site.niche,
    category: categoryId,
    description: site.description,
    tags: site.topics,
    status: 'active',
    country: 'US',
    language: 'en',
  });
  console.log(`  ✓ Website: ${site.name} (${website._id})`);

  // 2. Create BuilderProject
  const project = await BuilderProject.create({
    websiteId: website._id,
    name: `${site.name} Blog`,
    description: site.description,
    status: 'ready',
    framework: 'nextjs',
    settings: {
      primaryColor: site.primaryColor,
      secondaryColor: site.secondaryColor,
      fontFamily: 'Inter',
      siteName: site.name,
      siteDescription: site.description,
      languages: [{ code: 'en', name: 'English', direction: 'ltr', isDefault: true }],
      defaultLanguage: 'en',
      seoConfig: {
        niche: site.niche,
        country: 'US',
        targetKeywords: site.topics,
      },
    },
    blogConfig: {
      enabled: true,
      postsPerPage: 9,
      layout: 'grid',
      showCategories: true,
      showTags: true,
      showAuthor: true,
      showDate: true,
      showReadTime: true,
    },
  });
  console.log(`  ✓ Project: ${project.name} (${project._id})`);

  // 3. Create Pages
  const pages = [
    {
      name: 'Home',
      path: '/',
      type: 'static',
      isHomePage: true,
      code: generateHomePage(site),
      metaTitle: `${site.name} - ${site.tagline}`,
      metaDescription: site.description,
      order: 0,
    },
    {
      name: 'Blog',
      path: '/blog',
      type: 'blog-listing',
      isHomePage: false,
      code: generateBlogListingPage(site),
      metaTitle: `Blog - ${site.name}`,
      metaDescription: `Read the latest ${site.niche.toLowerCase()} articles and insights on ${site.name}.`,
      order: 1,
    },
    {
      name: 'Blog Post',
      path: '/blog/[slug]',
      type: 'blog-post',
      isHomePage: false,
      code: generateBlogPostPage(site),
      metaTitle: `Article - ${site.name}`,
      metaDescription: `Read this ${site.niche.toLowerCase()} article on ${site.name}.`,
      order: 2,
    },
    {
      name: 'About',
      path: '/about',
      type: 'static',
      isHomePage: false,
      code: generateAboutPage(site),
      metaTitle: `About - ${site.name}`,
      metaDescription: `Learn more about ${site.name} and our mission in ${site.niche.toLowerCase()}.`,
      order: 3,
    },
    {
      name: 'Contact',
      path: '/contact',
      type: 'static',
      isHomePage: false,
      code: generateContactPage(site),
      metaTitle: `Contact - ${site.name}`,
      metaDescription: `Get in touch with ${site.name}. We'd love to hear from you.`,
      order: 4,
    },
  ];

  const createdPages = [];
  for (const page of pages) {
    const p = await BuilderPage.create({
      projectId: project._id,
      ...page,
      language: 'en',
      status: 'generated',
      lastGeneratedAt: new Date(),
      aiPrompt: `WordPress-style ${site.niche} blog - ${page.name} page`,
    });
    createdPages.push(p);
  }
  console.log(`  ✓ Pages: ${createdPages.length} pages created`);

  // 4. Create Components (Header + Footer)
  const headerCode = generateHeaderComponent(site);
  const footerCode = generateFooterComponent(site);

  await BuilderComponent.create({
    projectId: project._id,
    name: 'Header',
    displayName: 'Header',
    description: `Navigation header for ${site.name}`,
    type: 'layout',
    scope: 'global',
    code: headerCode,
    exportPath: 'components/Header.tsx',
    usedInPages: createdPages.map(p => p._id),
  });

  await BuilderComponent.create({
    projectId: project._id,
    name: 'Footer',
    displayName: 'Footer',
    description: `Footer for ${site.name}`,
    type: 'layout',
    scope: 'global',
    code: footerCode,
    exportPath: 'components/Footer.tsx',
    usedInPages: createdPages.map(p => p._id),
  });
  console.log(`  ✓ Components: Header + Footer created`);

  return { website, project, pages: createdPages };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not set. Check your .env file.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('  Creating 9 WordPress-style Blog Sites');
  console.log('═══════════════════════════════════════════════════\n');

  const categoryId = await getOrCreateCategory();

  let created = 0;
  let skipped = 0;

  for (const site of SITES) {
    console.log(`\n[${SITES.indexOf(site) + 1}/9] ${site.name} (${site.niche})`);
    console.log('─'.repeat(40));
    const result = await createBlogSite(site, categoryId);
    if (result) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Done! Created: ${created} | Skipped: ${skipped}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('\nNext steps:');
  console.log('  1. Go to Admin > Builder to see all new sites');
  console.log('  2. Review/edit pages as needed');
  console.log('  3. Publish each site to deploy to Vercel');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
