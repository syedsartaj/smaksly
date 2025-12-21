import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Client from '@/models/Client';
import { dir } from 'tmp-promise';
import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const { email, vercel_id } = await req.json();

    if (!email || !vercel_id) {
      return NextResponse.json(
        { error: 'Email and vercel_id are required' },
        { status: 400 }
      );
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
    const VERCEL_TOKEN = process.env.VERCELTOKEN;

    if (!GITHUB_TOKEN || !GITHUB_USERNAME || !VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Missing configuration' },
        { status: 500 }
      );
    }

    await connectDB();

    // Find the deployment
    const client = await Client.findOne({
      email,
      'Deployments.vercel_id': vercel_id
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    const deployment = client.Deployments.find((d: any) => d.vercel_id === vercel_id);
    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    // Get the deployment's git repo name
    const gitRepoUrl = deployment.git_repo;
    const repoName = gitRepoUrl.split('/').pop()?.replace('.git', '');

    if (!repoName) {
      return NextResponse.json(
        { error: 'Could not determine repo name' },
        { status: 500 }
      );
    }

    // Determine template based on category
    const category = deployment.category || 'minimalist-blog';
    const templateRepoUrl = `https://github.com/${GITHUB_USERNAME}/${category}.git`;

    // Clone both repos to temp directories
    const tmpTemplate = await dir({ unsafeCleanup: true });
    const tmpDeployment = await dir({ unsafeCleanup: true });

    try {
      // Clone template
      const gitTemplate = simpleGit(tmpTemplate.path);
      await gitTemplate.clone(templateRepoUrl, '.');

      // Clone deployment repo
      const gitDeployment = simpleGit(tmpDeployment.path);
      await gitDeployment.clone(
        `https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${repoName}.git`,
        '.'
      );

      // Copy all files from template to deployment (except .git)
      const copyRecursive = (src: string, dest: string) => {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name === '.git') continue;

          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);

          if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true });
            }
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };

      copyRecursive(tmpTemplate.path, tmpDeployment.path);

      // Commit and push changes
      await gitDeployment.add('.');

      const status = await gitDeployment.status();
      if (status.files.length > 0) {
        await gitDeployment.commit('Sync with latest template updates');
        await gitDeployment.push('origin', 'main');
      }

      // Add SMAKSLY_ID env var to Vercel project
      await fetch(`https://api.vercel.com/v10/projects/${vercel_id}/env`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'SMAKSLY_ID',
          value: vercel_id,
          target: ['production', 'preview', 'development'],
        }),
      });

      // Trigger redeploy
      const projectRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercel_id}`,
        {
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
        }
      );

      if (projectRes.ok) {
        const projectData = await projectRes.json();

        await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: vercel_id,
            target: 'production',
            gitSource: {
              type: 'github',
              repoId: projectData.link?.repoId,
              ref: 'main',
            },
          }),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Template synced and redeployment triggered',
        filesUpdated: status.files.length,
      });

    } finally {
      // Cleanup temp directories
      await tmpTemplate.cleanup();
      await tmpDeployment.cleanup();
    }

  } catch (error: any) {
    console.error('Sync template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync template' },
      { status: 500 }
    );
  }
}
