import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, BuilderComponent, Website } from '@/models';
import { dir } from 'tmp-promise';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;

// POST - Publish project to GitHub
export async function POST(req: NextRequest, { params }: RouteParams) {
  let tmpDir: { path: string; cleanup: () => Promise<void> } | null = null;

  try {
    await connectDB();

    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { commitMessage } = body;

    // Get project with related data
    const project = await BuilderProject.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get website
    const website = await Website.findById(project.websiteId).lean();

    // Get pages and components
    const [pages, components] = await Promise.all([
      BuilderPage.find({ projectId: new mongoose.Types.ObjectId(projectId) }).lean(),
      BuilderComponent.find({ projectId: new mongoose.Types.ObjectId(projectId) }).lean(),
    ]);

    // Check if there's any content to publish
    const pagesWithCode = pages.filter((p) => p.code && p.code.trim().length > 0);
    if (pagesWithCode.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pages with code to publish. Generate page content first.' },
        { status: 400 }
      );
    }

    // Create temp directory
    tmpDir = await dir({ unsafeCleanup: true });
    const projectPath = tmpDir.path;

    // Generate project files
    await generateProjectFiles(projectPath, project, pages, components, website);

    // Initialize git
    const git = simpleGit(projectPath);
    await git.init();
    await git.add('.');

    const message =
      commitMessage?.trim() ||
      `Update from Smaksly Builder - ${new Date().toISOString().split('T')[0]}`;
    await git.commit(message);

    // Create or update GitHub repo
    let repoName = project.gitRepoName;

    if (!project.gitRepoUrl) {
      // Create new repo
      repoName = `smaksly-${project._id.toString().slice(-8)}`;

      const createRepoResponse = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          private: false,
          description: `Website built with Smaksly Builder - ${project.name}`,
          auto_init: false,
        }),
      });

      if (!createRepoResponse.ok) {
        const errorData = await createRepoResponse.json();
        // Check if repo already exists
        if (errorData.message?.includes('already exists')) {
          // Use existing repo
          console.log('Repository already exists, using existing');
        } else {
          throw new Error(`Failed to create GitHub repo: ${errorData.message}`);
        }
      }

      project.gitRepoUrl = `https://github.com/${GITHUB_USERNAME}/${repoName}`;
      project.gitRepoName = repoName;
    }

    // Set up remote and push
    const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${repoName}.git`;

    try {
      await git.removeRemote('origin');
    } catch {
      // Remote might not exist
    }

    await git.addRemote('origin', remoteUrl);

    // Force push (to handle first push and updates)
    await git.push('origin', 'main', ['--force', '-u']);

    // Get commit hash
    const log = await git.log({ maxCount: 1 });
    const commitHash = log.latest?.hash || '';

    // Update project
    project.lastDeployedAt = new Date();
    project.lastCommitHash = commitHash;
    project.lastCommitMessage = message;
    project.status = 'published';
    project.deploymentUrl = `https://${repoName}.vercel.app`;
    await project.save();

    // Also update the Website model with git repo info
    if (website) {
      await Website.findByIdAndUpdate(project.websiteId, {
        gitRepo: project.gitRepoUrl,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        gitRepoUrl: project.gitRepoUrl,
        deploymentUrl: project.deploymentUrl,
        commitHash,
        commitMessage: message,
      },
      message: 'Project published successfully. Vercel will auto-deploy from GitHub.',
    });
  } catch (error) {
    console.error('Error publishing project:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish project',
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temp directory
    if (tmpDir) {
      try {
        await tmpDir.cleanup();
      } catch (cleanupError) {
        console.error('Failed to cleanup temp directory:', cleanupError);
      }
    }
  }
}

async function generateProjectFiles(
  projectPath: string,
  project: InstanceType<typeof BuilderProject>,
  pages: Array<Record<string, unknown>>,
  components: Array<Record<string, unknown>>,
  website: Record<string, unknown> | null
) {
  // Create directory structure
  await fs.mkdir(path.join(projectPath, 'app'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'components'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'lib'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'public'), { recursive: true });

  const settings = project.settings || {};
  const siteName = settings.siteName || 'My Website';
  const primaryColor = settings.primaryColor || '#10b981';
  const fontFamily = settings.fontFamily || 'Inter';

  // Generate package.json
  const packageJson = {
    name: project.gitRepoName || 'smaksly-website',
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
    },
    dependencies: {
      next: '^14.2.0',
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'lucide-react': '^0.400.0',
    },
    devDependencies: {
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
      typescript: '^5',
      tailwindcss: '^3.4.0',
      autoprefixer: '^10',
      postcss: '^8',
    },
  };
  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate tsconfig.json
  const tsconfig = {
    compilerOptions: {
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: {
        '@/*': ['./*'],
      },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  };
  await fs.writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Generate tailwind.config.js
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '${primaryColor}',
      },
      fontFamily: {
        sans: ['${fontFamily}', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
`;
  await fs.writeFile(path.join(projectPath, 'tailwind.config.js'), tailwindConfig);

  // Generate postcss.config.js
  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
  await fs.writeFile(path.join(projectPath, 'postcss.config.js'), postcssConfig);

  // Generate next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
`;
  await fs.writeFile(path.join(projectPath, 'next.config.js'), nextConfig);

  // Generate globals.css
  const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: '${fontFamily}', system-ui, sans-serif;
}
`;
  await fs.writeFile(path.join(projectPath, 'app', 'globals.css'), globalsCss);

  // Generate layout.tsx
  const layoutCode = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${siteName}',
  description: '${settings.siteDescription || ''}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
`;
  await fs.writeFile(path.join(projectPath, 'app', 'layout.tsx'), layoutCode);

  // Generate pages
  for (const page of pages) {
    if (!page.code || typeof page.code !== 'string' || page.code.trim().length === 0) {
      continue;
    }

    const pagePath = page.path as string;
    let filePath: string;

    if (pagePath === '/') {
      filePath = path.join(projectPath, 'app', 'page.tsx');
    } else {
      // Handle dynamic routes like /blog/[slug]
      const pathParts = pagePath.slice(1).split('/');
      const dirPath = path.join(projectPath, 'app', ...pathParts);
      await fs.mkdir(dirPath, { recursive: true });
      filePath = path.join(dirPath, 'page.tsx');
    }

    await fs.writeFile(filePath, page.code as string);
  }

  // Generate components
  for (const component of components) {
    if (!component.code || typeof component.code !== 'string') {
      continue;
    }

    const componentPath = path.join(projectPath, 'components', `${component.name}.tsx`);
    await fs.writeFile(componentPath, component.code as string);
  }

  // Generate API client for blog data
  const apiClientCode = `const SMAKSLY_API = process.env.NEXT_PUBLIC_SMAKSLY_API || 'https://smaksly.com';
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || '${project._id}';

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  featuredImage: string;
  publishedAt: string;
  authorName: string;
  authorBio?: string;
  authorAvatar?: string;
  readingTime: number;
  tags: string[];
  category?: {
    name: string;
    slug: string;
  };
  metaTitle?: string;
  metaDescription?: string;
}

export async function getBlogs(page = 1, limit = 12): Promise<{
  blogs: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}> {
  try {
    const res = await fetch(
      \`\${SMAKSLY_API}/api/builder/blogs?projectId=\${PROJECT_ID}&page=\${page}&limit=\${limit}\`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch blogs');
    }

    const data = await res.json();
    return {
      blogs: data.data || [],
      pagination: data.pagination || { page, limit, total: 0, totalPages: 0, hasMore: false },
    };
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return {
      blogs: [],
      pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
    };
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(
      \`\${SMAKSLY_API}/api/builder/blogs?projectId=\${PROJECT_ID}&slug=\${slug}\`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}
`;
  await fs.writeFile(path.join(projectPath, 'lib', 'api.ts'), apiClientCode);

  // Generate placeholder.svg
  const placeholderSvg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#e5e7eb"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
    Image Placeholder
  </text>
</svg>`;
  await fs.writeFile(path.join(projectPath, 'public', 'placeholder.svg'), placeholderSvg);

  // Generate .gitignore
  const gitignore = `# Dependencies
node_modules
.pnp
.pnp.js

# Build
.next
out
build
dist

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Misc
.DS_Store
*.pem
.vercel
`;
  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);

  // Generate .env.example
  const envExample = `NEXT_PUBLIC_SMAKSLY_API=https://smaksly.com
NEXT_PUBLIC_PROJECT_ID=${project._id}
`;
  await fs.writeFile(path.join(projectPath, '.env.example'), envExample);
}
