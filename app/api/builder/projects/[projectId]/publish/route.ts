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
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;

// Helper function to trigger Vercel deployment
async function triggerVercelDeployment(repoName: string, projectId: string) {
  try {
    const deployResponse = await fetch(
      'https://api.vercel.com/v13/deployments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          project: projectId,
          target: 'production',
          gitSource: {
            type: 'github',
            repo: `${GITHUB_USERNAME}/${repoName}`,
            ref: 'main',
          },
        }),
      }
    );

    if (deployResponse.ok) {
      const deployment = await deployResponse.json();
      console.log('Triggered Vercel deployment:', deployment.id);
      return deployment;
    } else {
      const errorData = await deployResponse.json();
      console.error('Failed to trigger deployment:', errorData);
      return null;
    }
  } catch (error) {
    console.error('Error triggering deployment:', error);
    return null;
  }
}

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

    // Create or connect Vercel project
    let vercelProjectId = project.vercelProjectId;
    let deploymentUrl = project.deploymentUrl;

    if (!vercelProjectId && VERCEL_TOKEN) {
      try {
        // Check if project already exists on Vercel
        const checkProjectResponse = await fetch(
          `https://api.vercel.com/v9/projects/${repoName}`,
          {
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
            },
          }
        );

        if (checkProjectResponse.ok) {
          // Project exists, get its ID
          const existingProject = await checkProjectResponse.json();
          vercelProjectId = existingProject.id;
          deploymentUrl = `https://${existingProject.name}.vercel.app`;
          console.log('Found existing Vercel project:', vercelProjectId);
        } else {
          // Create new Vercel project connected to GitHub
          const createProjectResponse = await fetch(
            'https://api.vercel.com/v10/projects',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: repoName,
                framework: 'nextjs',
                gitRepository: {
                  type: 'github',
                  repo: `${GITHUB_USERNAME}/${repoName}`,
                },
                buildCommand: 'next build',
                installCommand: 'npm install',
                outputDirectory: '.next',
              }),
            }
          );

          if (createProjectResponse.ok) {
            const newProject = await createProjectResponse.json();
            vercelProjectId = newProject.id;
            deploymentUrl = `https://${newProject.name}.vercel.app`;
            console.log('Created new Vercel project:', vercelProjectId);

            // Trigger initial deployment for newly created project
            await triggerVercelDeployment(repoName!, vercelProjectId!);
          } else {
            const errorData = await createProjectResponse.json();
            console.error('Failed to create Vercel project:', errorData);
            // Continue anyway - GitHub repo was created successfully
          }
        }
      } catch (vercelError) {
        console.error('Vercel API error:', vercelError);
        // Continue anyway - GitHub repo was created successfully
      }
    }

    // Always trigger deployment if we have a Vercel project
    if (vercelProjectId && repoName && VERCEL_TOKEN) {
      await triggerVercelDeployment(repoName, vercelProjectId);
    }

    // Update project
    project.lastDeployedAt = new Date();
    project.lastCommitHash = commitHash;
    project.lastCommitMessage = message;
    project.status = 'published';
    project.vercelProjectId = vercelProjectId || undefined;
    project.deploymentUrl = deploymentUrl || `https://${repoName}.vercel.app`;
    await project.save();

    // Update the Website model with deployment info and mark as active
    if (website) {
      await Website.findByIdAndUpdate(project.websiteId, {
        gitRepo: project.gitRepoUrl,
        vercelProjectName: repoName,
        status: 'active',
        // Store deployment URL for easy access
        customDomain: project.deploymentUrl,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        gitRepoUrl: project.gitRepoUrl,
        deploymentUrl: project.deploymentUrl,
        vercelProjectId,
        commitHash,
        commitMessage: message,
      },
      message: vercelProjectId
        ? 'Project published successfully and deployed to Vercel.'
        : 'Project published to GitHub. Connect to Vercel manually or add VERCEL_TOKEN.',
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

  // Check for Header and Footer components
  const headerComponent = components.find(
    (c) => c.name?.toString().toLowerCase().includes('header') || c.name?.toString().toLowerCase().includes('nav')
  );
  const footerComponent = components.find(
    (c) => c.name?.toString().toLowerCase().includes('footer')
  );

  // Generate component imports and usage
  const componentImports: string[] = [];
  // Pass siteName and other settings as props to Header and Footer
  const headerJsx = headerComponent ? `<Header siteName="${siteName}" />` : '';
  const footerJsx = footerComponent ? `<Footer siteName="${siteName}" />` : '';

  if (headerComponent) {
    componentImports.push(`import Header from '@/components/${headerComponent.name}';`);
  }
  if (footerComponent) {
    componentImports.push(`import Footer from '@/components/${footerComponent.name}';`);
  }

  // Generate layout.tsx
  const layoutCode = `import type { Metadata } from 'next';
import './globals.css';
${componentImports.join('\n')}

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
        ${headerJsx}
        {children}
        ${footerJsx}
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
