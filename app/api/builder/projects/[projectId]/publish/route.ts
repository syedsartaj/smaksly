import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, BuilderPage, BuilderComponent, Website } from '@/models';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// Helper function to trigger Vercel deployment
async function triggerVercelDeployment(
  repoName: string,
  projectId: string,
  vercelToken: string,
  githubUsername: string,
  githubToken: string
) {
  try {
    // Get the GitHub repo ID (required by Vercel API)
    const repoResponse = await fetch(
      `https://api.github.com/repos/${githubUsername}/${repoName}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!repoResponse.ok) {
      console.error('Failed to fetch GitHub repo info:', await repoResponse.text());
      return null;
    }

    const repoData = await repoResponse.json();
    const repoId = repoData.id;

    const deployResponse = await fetch(
      'https://api.vercel.com/v13/deployments',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          project: projectId,
          target: 'production',
          gitSource: {
            type: 'github',
            repoId,
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
    // Dynamic imports to avoid build-time evaluation
    const { dir } = await import('tmp-promise');
    const { default: simpleGit } = await import('simple-git');

    // Resolve env vars at runtime, not module level
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

    if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
      return NextResponse.json(
        { success: false, error: 'GitHub credentials are not configured (GITHUB_TOKEN, GITHUB_USERNAME)' },
        { status: 500 }
      );
    }

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

    // Compute repoName early so we can predict the deployment URL for sitemap/robots
    let repoName = project.gitRepoName;
    if (!project.gitRepoUrl) {
      repoName = `smaksly-${project._id.toString().slice(-8)}`;
    }
    const predictedDeployUrl = project.deploymentUrl || `https://${repoName}.vercel.app`;

    // Create temp directory
    tmpDir = await dir({ unsafeCleanup: true });
    const projectPath = tmpDir.path;

    // Generate project files (pass predicted URL so sitemap works on first deploy)
    await generateProjectFiles(projectPath, project, pages, components, website, predictedDeployUrl);

    // Initialize git
    const git = simpleGit(projectPath);
    await git.init(['--initial-branch=main']);
    await git.addConfig('user.email', 'builder@smaksly.com');
    await git.addConfig('user.name', 'Smaksly Builder');
    await git.add('.');

    const message =
      commitMessage?.trim() ||
      `Update from Smaksly Builder - ${new Date().toISOString().split('T')[0]}`;
    await git.commit(message);

    // Create or update GitHub repo
    if (!project.gitRepoUrl) {

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
        console.error('GitHub repo creation error:', createRepoResponse.status, JSON.stringify(errorData));
        // Check if repo already exists
        if (
          errorData.message?.includes('already exists') ||
          errorData.errors?.some((e: { message?: string }) => e.message?.includes('already exists'))
        ) {
          // Use existing repo
          console.log('Repository already exists, using existing');
        } else if (createRepoResponse.status === 422 && errorData.message === 'Repository creation failed.') {
          // GitHub returns 422 with generic message — repo may exist under a different case or org
          // Try to use the repo anyway
          console.log('Repository creation returned 422, attempting to use existing repo');
        } else {
          throw new Error(`Failed to create GitHub repo (${createRepoResponse.status}): ${errorData.message}${errorData.errors ? ' - ' + JSON.stringify(errorData.errors) : ''}`);
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

    // Create or connect Vercel project — always verify it exists (may have been deleted externally)
    let vercelProjectId = project.vercelProjectId;
    let deploymentUrl = project.deploymentUrl;

    if (VERCEL_TOKEN) {
      try {
        // Always check if the Vercel project still exists
        const checkProjectResponse = await fetch(
          `https://api.vercel.com/v9/projects/${vercelProjectId || repoName}`,
          {
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
            },
          }
        );

        if (checkProjectResponse.ok) {
          // Project exists, get/update its ID
          const existingProject = await checkProjectResponse.json();
          vercelProjectId = existingProject.id;
          deploymentUrl = `https://${existingProject.name}.vercel.app`;
          console.log('Found existing Vercel project:', vercelProjectId);
        } else {
          // Project doesn't exist (or was deleted) — create it
          console.log('Vercel project not found, creating new one...');
          vercelProjectId = undefined;

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
          } else {
            const errorData = await createProjectResponse.json();
            console.error('Failed to create Vercel project:', errorData);
          }
        }
      } catch (vercelError) {
        console.error('Vercel API error:', vercelError);
      }
    }

    // Set Vercel environment variables (needed for blog API calls at build time)
    if (vercelProjectId && VERCEL_TOKEN) {
      const siteUrl = predictedDeployUrl;
      const envVars = [
        { key: 'NEXT_PUBLIC_SMAKSLY_API', value: process.env.SMAKSLY_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://smakaly-334466283114.me-central1.run.app', target: ['production', 'preview', 'development'], type: 'plain' },
        { key: 'NEXT_PUBLIC_PROJECT_ID', value: project._id.toString(), target: ['production', 'preview', 'development'], type: 'plain' },
        { key: 'NEXT_PUBLIC_SITE_URL', value: siteUrl, target: ['production', 'preview', 'development'], type: 'plain' },
      ];
      for (const envVar of envVars) {
        try {
          // Try to create; if it already exists, update it
          const createRes = await fetch(
            `https://api.vercel.com/v10/projects/${vercelProjectId}/env`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(envVar),
            }
          );
          if (!createRes.ok) {
            const errData = await createRes.json();
            // If env var already exists, patch it
            if (errData.error?.code === 'ENV_ALREADY_EXISTS') {
              const existingId = errData.error?.envVarId || errData.error?.id;
              if (existingId) {
                await fetch(
                  `https://api.vercel.com/v9/projects/${vercelProjectId}/env/${existingId}`,
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${VERCEL_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ value: envVar.value }),
                  }
                );
              }
            }
          }
        } catch (envError) {
          console.error(`Failed to set env var ${envVar.key}:`, envError);
        }
      }
    }

    // Always trigger deployment if we have a Vercel project
    if (vercelProjectId && repoName && VERCEL_TOKEN) {
      await triggerVercelDeployment(repoName, vercelProjectId, VERCEL_TOKEN, GITHUB_USERNAME, GITHUB_TOKEN);
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

// Escape single quotes for use in generated JS/TS string literals
function esc(str: string | undefined | null): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function generateProjectFiles(
  projectPath: string,
  project: InstanceType<typeof BuilderProject>,
  pages: Array<Record<string, unknown>>,
  components: Array<Record<string, unknown>>,
  website: Record<string, unknown> | null,
  predictedDeployUrl?: string
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
      strict: false,
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
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
  const headerJsx = headerComponent ? `<Header siteName="${siteName.replace(/"/g, '&quot;')}" />` : '';
  const footerJsx = footerComponent ? `<Footer siteName="${siteName.replace(/"/g, '&quot;')}" />` : '';

  if (headerComponent) {
    componentImports.push(`import _Header from '@/components/${headerComponent.name}';\nconst Header = _Header as any;`);
  }
  if (footerComponent) {
    componentImports.push(`import _Footer from '@/components/${footerComponent.name}';\nconst Footer = _Footer as any;`);
  }

  // Resolve favicon and SEO metadata
  const faviconUrl = settings.branding?.websiteIcon || settings.favicon || '';
  const seoMetadata = settings.seoMetadata || {};
  const seoConfig = settings.seoConfig || {};
  const ogImage = seoMetadata.ogImage || '';
  const twitterCard = seoMetadata.twitterCard || 'summary_large_image';
  const twitterHandle = seoMetadata.twitterHandle || '';
  const themeColor = seoMetadata.themeColor || '';
  const siteDescription = settings.siteDescription || '';
  const defaultLanguage = settings.defaultLanguage || seoConfig.language || 'en';
  const deploymentUrl = predictedDeployUrl || project.deploymentUrl || seoConfig.canonicalBase || '';

  // Build metadata object pieces
  const metadataLines: string[] = [];
  metadataLines.push(`  title: {`);
  metadataLines.push(`    default: '${esc(siteName)}',`);
  metadataLines.push(`    template: '%s | ${esc(siteName)}',`);
  metadataLines.push(`  },`);
  metadataLines.push(`  description: '${esc(siteDescription)}',`);

  if (faviconUrl) {
    metadataLines.push(`  icons: {`);
    metadataLines.push(`    icon: '${faviconUrl}',`);
    metadataLines.push(`    apple: '${faviconUrl}',`);
    metadataLines.push(`  },`);
  }

  // Use env var at runtime so custom domains work without re-publishing
  metadataLines.push(`  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || '${deploymentUrl || 'https://localhost:3000'}'),`);

  // OpenGraph
  const ogLines: string[] = [];
  ogLines.push(`    title: '${esc(siteName)}',`);
  ogLines.push(`    description: '${esc(siteDescription)}',`);
  ogLines.push(`    siteName: '${esc(siteName)}',`);
  if (ogImage) {
    ogLines.push(`    images: ['${ogImage}'],`);
  }
  metadataLines.push(`  openGraph: {`);
  metadataLines.push(ogLines.join('\n'));
  metadataLines.push(`  },`);

  // Twitter
  const twLines: string[] = [];
  twLines.push(`    card: '${twitterCard}',`);
  twLines.push(`    title: '${esc(siteName)}',`);
  twLines.push(`    description: '${esc(siteDescription)}',`);
  if (twitterHandle) {
    twLines.push(`    creator: '${twitterHandle}',`);
  }
  if (ogImage) {
    twLines.push(`    images: ['${ogImage}'],`);
  }
  metadataLines.push(`  twitter: {`);
  metadataLines.push(twLines.join('\n'));
  metadataLines.push(`  },`);

  if (themeColor) {
    metadataLines.push(`  themeColor: '${themeColor}',`);
  }

  // Build JSON-LD structured data based on schema type
  let jsonLdScript = '';
  const schemaType = seoConfig.schemaType || 'WebSite';
  const jsonLdObj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: seoConfig.businessName || siteName,
    url: deploymentUrl || undefined,
    description: siteDescription || undefined,
  };

  if (schemaType === 'LocalBusiness' || schemaType === 'Organization') {
    if (seoConfig.businessAddress) jsonLdObj.address = { '@type': 'PostalAddress', streetAddress: seoConfig.businessAddress };
    if (seoConfig.businessPhone) jsonLdObj.telephone = seoConfig.businessPhone;
    if (seoConfig.businessEmail) jsonLdObj.email = seoConfig.businessEmail;
    if (seoConfig.region) jsonLdObj.areaServed = seoConfig.region;
  }

  // Remove undefined values
  Object.keys(jsonLdObj).forEach(k => { if (jsonLdObj[k] === undefined) delete jsonLdObj[k]; });

  jsonLdScript = `
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(${JSON.stringify(jsonLdObj)}) }}
        />`;

  // Generate layout.tsx
  const layoutCode = `import type { Metadata } from 'next';
import './globals.css';
${componentImports.join('\n')}

export const metadata: Metadata = {
${metadataLines.join('\n')}
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="${defaultLanguage}">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap" rel="stylesheet" />${jsonLdScript}
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

  // Determine if multi-language
  const projectLanguages = settings.languages || [];
  const isMultiLang = projectLanguages.length > 1;

  // Helper to write a page file with optional per-page metadata
  async function writePageFile(page: Record<string, unknown>, targetDir: string) {
    const pagePath = page.path as string;
    const pageType = page.type as string;
    let filePath: string;
    let dirPath: string;

    if (pagePath === '/') {
      dirPath = targetDir;
      filePath = path.join(dirPath, 'page.tsx');
    } else {
      const pathParts = pagePath.slice(1).split('/');
      dirPath = path.join(targetDir, ...pathParts);
      await fs.mkdir(dirPath, { recursive: true });
      filePath = path.join(dirPath, 'page.tsx');
    }

    let pageCode = page.code as string;

    // Sanitize common AI-generated code issues for all page types
    pageCode = pageCode
      // Fix <Link><a>...</a></Link> → <Link>...</Link> (Next.js 13+ Link renders its own <a>)
      .replace(/<Link(\s[^>]*)>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/Link>/g, '<Link$1>$2</Link>')
      // Remove deprecated layout prop from next/image
      .replace(/\s+layout\s*=\s*"(responsive|fill|fixed|intrinsic)"/g, '')
      // Remove deprecated objectFit prop from next/image
      .replace(/\s+objectFit\s*=\s*"[^"]*"/g, '');

    // --- Blog listing pages: wrap with server-side data fetching ---
    if (pageType === 'blog-listing') {
      // Save AI-generated component as a client component
      let clientCode = pageCode;
      if (!clientCode.trimStart().startsWith("'use client'") && !clientCode.trimStart().startsWith('"use client"')) {
        clientCode = "'use client';\n\n" + clientCode;
      }
      await fs.writeFile(path.join(dirPath, 'BlogListingClient.tsx'), clientCode);

      // Build per-page metadata lines
      const metaLines: string[] = [];
      if (page.metaTitle) metaLines.push(`  title: '${esc(page.metaTitle as string)}',`);
      if (page.metaDescription) metaLines.push(`  description: '${esc(page.metaDescription as string)}',`);
      if (page.ogImage) metaLines.push(`  openGraph: { images: ['${page.ogImage}'] },`);
      const metaBlock = metaLines.length > 0
        ? `\nexport const metadata: Metadata = {\n${metaLines.join('\n')}\n};\n`
        : '';

      // Create server page.tsx that fetches blog data and passes to client
      let serverPage: string;
      if (isMultiLang) {
        serverPage = `import { getBlogs } from '@/lib/api';
import type { Metadata } from 'next';
import _BlogListingClient from './BlogListingClient';
const BlogListingClient = _BlogListingClient as any;

export const revalidate = 60;
${metaBlock}
export default async function BlogListingPage({ params }: { params: { lang: string } }) {
  const { blogs } = await getBlogs(1, 100);
  return <BlogListingClient blogs={blogs} blogBasePath={\`/\${params.lang}/blog\`} />;
}
`;
      } else {
        serverPage = `import { getBlogs } from '@/lib/api';
import type { Metadata } from 'next';
import _BlogListingClient from './BlogListingClient';
const BlogListingClient = _BlogListingClient as any;

export const revalidate = 60;
${metaBlock}
export default async function BlogListingPage() {
  const { blogs } = await getBlogs(1, 100);
  return <BlogListingClient blogs={blogs} />;
}
`;
      }
      await fs.writeFile(filePath, serverPage);
      return;
    }

    // --- Blog post detail pages: wrap with server-side slug-based fetching ---
    if (pageType === 'blog-post') {
      // Save AI-generated component as a client component
      let clientCode = pageCode;
      if (!clientCode.trimStart().startsWith("'use client'") && !clientCode.trimStart().startsWith('"use client"')) {
        clientCode = "'use client';\n\n" + clientCode;
      }
      // Fix common AI-generated type issues for blog-post client components:
      // 1. Fix `blog = {}` or `blog = {} as X` patterns that cause TS errors
      clientCode = clientCode
        .replace(/\{\s*blog\s*=\s*\{\}\s*as\s*\w+\s*/g, '{ blog ')
        .replace(/\{\s*blog\s*=\s*\{\}\s*/g, '{ blog ');

      // 2. Ensure the function signature has proper typing for `blog` prop
      //    Match patterns like `function BlogPost({ blog, ...` or `function BlogPost({ blog })`
      //    and add `: { blog: any; [key: string]: any }` if no type annotation exists
      if (!clientCode.match(/\}\s*:\s*\w+/)) {
        // No type annotation on destructured props — add one
        clientCode = clientCode.replace(
          /export\s+default\s+function\s+\w+\s*\(\s*\{([^}]*)\}\s*\)\s*\{/,
          (match, params) => {
            return match.replace(`{${params}}`, `{${params}}: { blog: any; blogBasePath?: string; [key: string]: any }`);
          }
        );
      }

      // 3. Ensure there's a null guard for blog property access
      if (!clientCode.includes('!blog ||') && !clientCode.includes('!blog||') && !clientCode.includes('!blog)')) {
        // Add null guard at the top of the component body if blog is accessed without checks
        clientCode = clientCode.replace(
          /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)/,
          '$1\n  if (!blog) return <div className="text-center py-20"><p>Post not found</p></div>;'
        );
      }
      await fs.writeFile(path.join(dirPath, 'BlogPostClient.tsx'), clientCode);

      // Create server page.tsx with dynamic slug extraction and metadata
      let serverPage: string;
      if (isMultiLang) {
        serverPage = `import { getBlogBySlug, getBlogs } from '@/lib/api';
import type { Metadata } from 'next';
import _BlogPostClient from './BlogPostClient';
const BlogPostClient = _BlogPostClient as any;

export const revalidate = 60;

interface BlogPostPageProps {
  params: { lang: string; slug: string };
}

export async function generateStaticParams() {
  const { blogs } = await getBlogs(1, 50);
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const blog = await getBlogBySlug(params.slug);
  return {
    title: blog?.metaTitle || blog?.title || 'Blog Post',
    description: blog?.metaDescription || blog?.excerpt || '',
    openGraph: blog?.featuredImage ? { images: [blog.featuredImage] } : undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const blog = await getBlogBySlug(params.slug);
  return <BlogPostClient blog={blog || null} blogBasePath={\`/\${params.lang}/blog\`} />;
}
`;
      } else {
        serverPage = `import { getBlogBySlug, getBlogs } from '@/lib/api';
import type { Metadata } from 'next';
import _BlogPostClient from './BlogPostClient';
const BlogPostClient = _BlogPostClient as any;

export const revalidate = 60;

interface BlogPostPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const { blogs } = await getBlogs(1, 50);
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const blog = await getBlogBySlug(params.slug);
  return {
    title: blog?.metaTitle || blog?.title || 'Blog Post',
    description: blog?.metaDescription || blog?.excerpt || '',
    openGraph: blog?.featuredImage ? { images: [blog.featuredImage] } : undefined,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const blog = await getBlogBySlug(params.slug);
  return <BlogPostClient blog={blog || null} />;
}
`;
      }
      await fs.writeFile(filePath, serverPage);
      return;
    }

    // --- Non-blog pages: add per-page metadata as before ---
    const hasPageMeta = page.metaTitle || page.metaDescription || page.ogImage;
    if (hasPageMeta) {
      const isClientComponent = pageCode.trimStart().startsWith("'use client'") || pageCode.trimStart().startsWith('"use client"');

      if (isClientComponent) {
        const pageMetaLines: string[] = [];
        if (page.metaTitle) pageMetaLines.push(`  title: '${esc(page.metaTitle as string)}',`);
        if (page.metaDescription) pageMetaLines.push(`  description: '${esc(page.metaDescription as string)}',`);
        if (page.ogImage) {
          pageMetaLines.push(`  openGraph: { images: ['${page.ogImage}'] },`);
        }
        const pageLayoutCode = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n${pageMetaLines.join('\n')}\n};\n\nexport default function PageLayout({ children }: { children: React.ReactNode }) {\n  return <>{children}</>;\n}\n`;
        await fs.writeFile(path.join(dirPath, 'layout.tsx'), pageLayoutCode);
      } else {
        const pageMetaLines: string[] = [];
        if (page.metaTitle) pageMetaLines.push(`  title: '${esc(page.metaTitle as string)}',`);
        if (page.metaDescription) pageMetaLines.push(`  description: '${esc(page.metaDescription as string)}',`);
        if (page.ogImage) {
          pageMetaLines.push(`  openGraph: { images: ['${page.ogImage}'] },`);
        }
        const metaExport = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n${pageMetaLines.join('\n')}\n};\n\n`;
        pageCode = metaExport + pageCode;
      }
    }

    await fs.writeFile(filePath, pageCode);
  }

  if (isMultiLang) {
    // Multi-language path: generate app/[lang]/... structure

    // Generate middleware.ts for language redirect
    const langCodes = projectLanguages.map((l: { code: string }) => l.code);
    const middlewareCode = `import { NextRequest, NextResponse } from 'next/server';

const locales = ${JSON.stringify(langCodes)};
const defaultLocale = '${defaultLanguage}';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the pathname already has a locale
  const hasLocale = locales.some(
    (locale) => pathname.startsWith(\`/\${locale}/\`) || pathname === \`/\${locale}\`
  );

  if (hasLocale) return NextResponse.next();

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Redirect to default locale
  const url = request.nextUrl.clone();
  url.pathname = \`/\${defaultLocale}\${pathname}\`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
`;
    await fs.writeFile(path.join(projectPath, 'middleware.ts'), middlewareCode);

    // Generate [lang] dynamic segment directory
    const langDir = path.join(projectPath, 'app', '[lang]');
    await fs.mkdir(langDir, { recursive: true });

    // Build a language config map for the layout
    const langConfigMap: Record<string, { direction: string; name: string }> = {};
    for (const lang of projectLanguages) {
      langConfigMap[lang.code] = {
        direction: lang.direction || 'ltr',
        name: lang.name || lang.code,
      };
    }

    // Generate app/[lang]/layout.tsx that sets dir and lang
    const langLayoutCode = `import type { Metadata } from 'next';

const langConfig: Record<string, { direction: string; name: string }> = ${JSON.stringify(langConfigMap, null, 2)};

export function generateStaticParams() {
  return ${JSON.stringify(langCodes.map((c) => ({ lang: c })))};
}

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const config = langConfig[params.lang] || { direction: 'ltr', name: 'English' };

  return (
    <div dir={config.direction} lang={params.lang}>
      {children}
    </div>
  );
}
`;
    await fs.writeFile(path.join(langDir, 'layout.tsx'), langLayoutCode);

    // Group pages by language and write them under [lang]/
    for (const page of pages) {
      if (!page.code || typeof page.code !== 'string' || (page.code as string).trim().length === 0) {
        continue;
      }
      // All pages go under app/[lang]/...
      await writePageFile(page, langDir);
    }
  } else {
    // Single-language fast path: flat structure (backwards compatible)
    for (const page of pages) {
      if (!page.code || typeof page.code !== 'string' || (page.code as string).trim().length === 0) {
        continue;
      }
      await writePageFile(page, path.join(projectPath, 'app'));
    }
  }

  // Generate components
  for (const component of components) {
    if (!component.code || typeof component.code !== 'string') {
      continue;
    }

    let code = component.code as string;
    const name = component.name as string;

    const componentPath = path.join(projectPath, 'components', `${name}.tsx`);
    await fs.writeFile(componentPath, code);
  }

  // Generate error.tsx for graceful error handling
  const errorPage = `'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
`;
  await fs.writeFile(path.join(projectPath, 'app', 'error.tsx'), errorPage);

  // Generate not-found.tsx
  const notFoundPage = `import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
        <Link href="/" className="px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity inline-block">
          Go Home
        </Link>
      </div>
    </main>
  );
}
`;
  await fs.writeFile(path.join(projectPath, 'app', 'not-found.tsx'), notFoundPage);

  // Generate API client for blog data
  const apiClientCode = `const SMAKSLY_API = process.env.NEXT_PUBLIC_SMAKSLY_API || 'https://smakaly-334466283114.me-central1.run.app';
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || '${project._id}';

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
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
      \`\${SMAKSLY_API}/api/builder/blogs?projectId=\${PROJECT_ID}&page=\${page}&limit=\${limit}&skipDummy=true\`,
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
    const blog = data.data;
    if (!blog) return null;
    return { ...blog, body: blog.body || '' };
  } catch (error) {
    console.error('Error fetching blog:', error);
    return null;
  }
}

export interface SitemapPage {
  path: string;
  type: string;
  updatedAt: string;
}

export async function getPages(): Promise<SitemapPage[]> {
  try {
    const res = await fetch(
      \`\${SMAKSLY_API}/api/builder/pages/sitemap?projectId=\${PROJECT_ID}\`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching pages:', error);
    return [];
  }
}

// Fetch ALL blogs for sitemap (paginates through all pages, skips dummy data)
export async function getAllBlogsForSitemap(): Promise<BlogPost[]> {
  const allBlogs: BlogPost[] = [];
  let page = 1;
  const limit = 50;

  try {
    while (true) {
      const res = await fetch(
        \`\${SMAKSLY_API}/api/builder/blogs?projectId=\${PROJECT_ID}&page=\${page}&limit=\${limit}&skipDummy=true\`,
        { next: { revalidate: 60 } }
      );

      if (!res.ok) break;

      const data = await res.json();
      const blogs = data.data || [];
      if (blogs.length === 0) break;

      allBlogs.push(...blogs);

      if (!data.pagination?.hasMore) break;
      page++;
    }
  } catch (error) {
    console.error('Error fetching all blogs for sitemap:', error);
  }

  return allBlogs;
}
`;
  await fs.writeFile(path.join(projectPath, 'lib', 'api.ts'), apiClientCode);

  // Generate app/sitemap.ts - fully dynamic sitemap (pages + blogs fetched via API with ISR)
  const sitemapCode = generateSitemapCode(project, pages, isMultiLang, projectLanguages, defaultLanguage);
  await fs.writeFile(path.join(projectPath, 'app', 'sitemap.ts'), sitemapCode);

  // Generate app/robots.ts
  const robotsCode = generateRobotsCode();
  await fs.writeFile(path.join(projectPath, 'app', 'robots.ts'), robotsCode);

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

# Env (keep .env committed - it only has NEXT_PUBLIC_ vars)
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
  const envExample = `NEXT_PUBLIC_SMAKSLY_API=https://smakaly-334466283114.me-central1.run.app
NEXT_PUBLIC_PROJECT_ID=${project._id}
`;
  await fs.writeFile(path.join(projectPath, '.env.example'), envExample);

  // Generate .env with actual values (NEXT_PUBLIC_ vars are safe to commit - needed at build time)
  // SMAKSLY_API must always point to the admin platform, NOT the child site's domain
  const smakslyApi = process.env.SMAKSLY_API_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://smakaly-334466283114.me-central1.run.app';
  const siteDeployUrl = predictedDeployUrl || project.deploymentUrl || '';
  const envFile = `NEXT_PUBLIC_SMAKSLY_API=${smakslyApi}
NEXT_PUBLIC_PROJECT_ID=${project._id}
NEXT_PUBLIC_SITE_URL=${siteDeployUrl}
`;
  await fs.writeFile(path.join(projectPath, '.env'), envFile);
}

// Generate dynamic sitemap.ts for the published Next.js project
function generateSitemapCode(
  project: InstanceType<typeof BuilderProject>,
  pages: Array<Record<string, unknown>>,
  isMultiLang: boolean,
  projectLanguages: Array<{ code: string; direction: string; name: string }>,
  defaultLanguage: string
): string {
  const hasBlogPages = pages.some(
    (p) => p.code && (p.code as string).trim().length > 0 && ((p.type as string) === 'blog-listing' || (p.type as string) === 'blog-post')
  );
  const langCodes = projectLanguages.map((l) => l.code);

  if (isMultiLang) {
    return `import { MetadataRoute } from 'next';
import { getPages${hasBlogPages ? ', getAllBlogsForSitemap' : ''} } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '${project.deploymentUrl || ''}';
const LANGUAGES = ${JSON.stringify(langCodes)};
const DEFAULT_LANG = '${defaultLanguage}';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!BASE_URL) return [];

  const entries: MetadataRoute.Sitemap = [];

  // Dynamic pages from API
  const pages = await getPages();
  for (const page of pages) {
    if (page.type === 'blog-post') continue;
    const priority = page.path === '/' ? 1.0 : 0.8;
    const languages: Record<string, string> = {};
    for (const lang of LANGUAGES) {
      languages[lang] = \`\${BASE_URL}/\${lang}\${page.path === '/' ? '' : page.path}\`;
    }
    entries.push({
      url: \`\${BASE_URL}/\${DEFAULT_LANG}\${page.path === '/' ? '' : page.path}\`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: page.path === '/' ? 'daily' : 'weekly',
      priority,
      alternates: { languages },
    });
  }
${hasBlogPages ? `
  // Dynamic blog posts (fetches ALL pages, skips dummy data)
  try {
    const blogs = await getAllBlogsForSitemap();
    for (const blog of blogs) {
      const languages: Record<string, string> = {};
      for (const lang of LANGUAGES) {
        languages[lang] = \`\${BASE_URL}/\${lang}/blog/\${blog.slug}\`;
      }
      entries.push({
        url: \`\${BASE_URL}/\${DEFAULT_LANG}/blog/\${blog.slug}\`,
        lastModified: new Date(blog.publishedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates: { languages },
      });
    }
  } catch (error) {
    console.error('Sitemap: failed to fetch blogs', error);
  }
` : ''}
  return entries;
}
`;
  } else {
    return `import { MetadataRoute } from 'next';
import { getPages${hasBlogPages ? ', getAllBlogsForSitemap' : ''} } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '${project.deploymentUrl || ''}';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!BASE_URL) return [];

  const entries: MetadataRoute.Sitemap = [];

  // Dynamic pages from API
  const pages = await getPages();
  for (const page of pages) {
    if (page.type === 'blog-post') continue;
    entries.push({
      url: \`\${BASE_URL}\${page.path === '/' ? '' : page.path}\`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: page.path === '/' ? 'daily' : 'weekly',
      priority: page.path === '/' ? 1.0 : 0.8,
    });
  }
${hasBlogPages ? `
  // Dynamic blog posts (fetches ALL pages, skips dummy data)
  try {
    const blogs = await getAllBlogsForSitemap();
    for (const blog of blogs) {
      entries.push({
        url: \`\${BASE_URL}/blog/\${blog.slug}\`,
        lastModified: new Date(blog.publishedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error('Sitemap: failed to fetch blogs', error);
  }
` : ''}
  return entries;
}
`;
  }
}

// Generate robots.ts for the published Next.js project
function generateRobotsCode(): string {
  return `import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    ...(BASE_URL ? { sitemap: \`\${BASE_URL}/sitemap.xml\` } : {}),
  };
}
`;
}
