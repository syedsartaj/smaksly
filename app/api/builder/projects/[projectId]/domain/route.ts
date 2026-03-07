import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject } from '@/models';
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

    return NextResponse.json({
      success: true,
      data: {
        domains: data.domains || [],
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

    return NextResponse.json({
      success: true,
      data: addData,
      message: `Domain ${domain} added successfully`,
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
