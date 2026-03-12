import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject, Website } from '@/models';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET - Get domains for a project's Vercel deployment
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { projectId } = await params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await BuilderProject.findById(projectId).lean();
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (!project.vercelProjectId) {
      return NextResponse.json({ success: true, data: { domains: [], message: 'Project not deployed yet' } });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
      return NextResponse.json({ success: false, error: 'Vercel token not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.vercel.com/v9/projects/${project.vercelProjectId}/domains`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch domains from Vercel' }, { status: 500 });
    }

    const data = await res.json();

    // Enrich each domain with verification status and required DNS records
    const domains = (data.domains || []).map((d: Record<string, unknown>) => {
      const domainName = d.name as string;
      const parts = domainName.split('.');
      const isApex = parts.length === 2;

      return {
        ...d,
        dnsRecords: isApex
          ? [{ type: 'A', name: '@', value: '76.76.21.21' }]
          : [{ type: 'CNAME', name: parts[0], value: 'cname.vercel-dns.com' }],
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        domains,
        vercelProjectId: project.vercelProjectId,
        deploymentUrl: project.deploymentUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch domains' }, { status: 500 });
  }
}

// POST - Add a custom domain to the project's Vercel deployment
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { domain } = await req.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    // Basic domain validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ success: false, error: 'Invalid domain format' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await BuilderProject.findById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (!project.vercelProjectId) {
      return NextResponse.json({ success: false, error: 'Project must be deployed before adding a domain' }, { status: 400 });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
      return NextResponse.json({ success: false, error: 'Vercel token not configured' }, { status: 500 });
    }

    // Add domain to Vercel project
    const addRes = await fetch(
      `https://api.vercel.com/v10/projects/${project.vercelProjectId}/domains`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: domain }),
      }
    );

    const addData = await addRes.json();

    if (!addRes.ok) {
      return NextResponse.json({
        success: false,
        error: addData.error?.message || 'Failed to add domain to Vercel',
        verification: addData.error?.code === 'domain_needs_verification' ? addData : undefined,
      }, { status: 400 });
    }

    // Update project's deployment URL to the custom domain
    await BuilderProject.findByIdAndUpdate(projectId, {
      deploymentUrl: `https://${domain}`,
    });

    // Update the Website record's domain to match the custom domain
    if (project.websiteId) {
      await Website.findByIdAndUpdate(project.websiteId, { domain });
    }

    // Update NEXT_PUBLIC_SITE_URL env var on Vercel so sitemap/robots/metadata use the custom domain
    try {
      const envRes = await fetch(
        `https://api.vercel.com/v10/projects/${project.vercelProjectId}/env`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'NEXT_PUBLIC_SITE_URL',
            value: `https://${domain}`,
            target: ['production', 'preview', 'development'],
            type: 'plain',
          }),
        }
      );
      if (!envRes.ok) {
        const errData = await envRes.json();
        if (errData.error?.code === 'ENV_ALREADY_EXISTS') {
          const existingId = errData.error?.envVarId || errData.error?.id;
          if (existingId) {
            await fetch(
              `https://api.vercel.com/v9/projects/${project.vercelProjectId}/env/${existingId}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${VERCEL_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: `https://${domain}` }),
              }
            );
          }
        }
      }
    } catch (envError) {
      console.error('Failed to update NEXT_PUBLIC_SITE_URL on Vercel:', envError);
    }

    // Trigger a redeploy so the build-time NEXT_PUBLIC_SITE_URL takes effect in sitemap/robots/metadata
    try {
      const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
      const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'smaksly';
      const gitRepoName = project.gitRepoName || `smaksly-${project._id.toString().slice(-8)}`;
      if (GITHUB_TOKEN) {
        // Get GitHub repo ID (required by Vercel API)
        const repoRes = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${gitRepoName}`,
          { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
        );
        if (repoRes.ok) {
          const repoData = await repoRes.json();
          await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: gitRepoName,
              project: project.vercelProjectId,
              target: 'production',
              gitSource: { type: 'github', repoId: repoData.id, ref: 'main' },
            }),
          });
        }
      }
    } catch (deployError) {
      console.error('Failed to trigger redeploy after domain change:', deployError);
    }

    // Build required DNS records for the user
    const parts = domain.split('.');
    const isApex = parts.length === 2;
    const requiredRecords = isApex
      ? [
          { type: 'A', name: '@', value: '76.76.21.21', description: 'Points your domain to Vercel' },
          { type: 'AAAA', name: '@', value: '2606:50c0:8000::1a', description: 'IPv6 (optional)' },
        ]
      : [
          { type: 'CNAME', name: parts[0], value: 'cname.vercel-dns.com', description: 'Points your subdomain to Vercel' },
        ];

    return NextResponse.json({
      success: true,
      data: {
        ...addData,
        requiredRecords,
      },
      message: `Domain ${domain} added. Configure the DNS records below, then verify.`,
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return NextResponse.json({ success: false, error: 'Failed to add domain' }, { status: 500 });
  }
}

// DELETE - Remove a custom domain from the project's Vercel deployment
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await BuilderProject.findById(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (!project.vercelProjectId) {
      return NextResponse.json({ success: false, error: 'Project not deployed' }, { status: 400 });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
      return NextResponse.json({ success: false, error: 'Vercel token not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.vercel.com/v9/projects/${project.vercelProjectId}/domains/${domain}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );

    if (!res.ok && res.status !== 404) {
      return NextResponse.json({ success: false, error: 'Failed to remove domain' }, { status: 500 });
    }

    // If this was the deployment URL, reset to vercel.app URL
    if (project.deploymentUrl === `https://${domain}`) {
      const vercelUrl = project.gitRepoName ? `https://${project.gitRepoName}.vercel.app` : '';
      await BuilderProject.findByIdAndUpdate(projectId, { deploymentUrl: vercelUrl });

      // Revert Website domain back to Vercel subdomain
      if (project.websiteId && project.gitRepoName) {
        await Website.findByIdAndUpdate(project.websiteId, { domain: `${project.gitRepoName}.vercel.app` });
      }

      // Update NEXT_PUBLIC_SITE_URL env var back to vercel.app URL
      if (vercelUrl) {
        try {
          const envRes = await fetch(
            `https://api.vercel.com/v10/projects/${project.vercelProjectId}/env`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key: 'NEXT_PUBLIC_SITE_URL',
                value: vercelUrl,
                target: ['production', 'preview', 'development'],
                type: 'plain',
              }),
            }
          );
          if (!envRes.ok) {
            const errData = await envRes.json();
            if (errData.error?.code === 'ENV_ALREADY_EXISTS') {
              const existingId = errData.error?.envVarId || errData.error?.id;
              if (existingId) {
                await fetch(
                  `https://api.vercel.com/v9/projects/${project.vercelProjectId}/env/${existingId}`,
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${VERCEL_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ value: vercelUrl }),
                  }
                );
              }
            }
          }
        } catch (envError) {
          console.error('Failed to reset NEXT_PUBLIC_SITE_URL on Vercel:', envError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${domain} removed successfully`,
    });
  } catch (error) {
    console.error('Error removing domain:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove domain' }, { status: 500 });
  }
}
