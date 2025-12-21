import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Client from '@/models/Client';

export async function POST(req: NextRequest) {
  try {
    const { email, vercel_id } = await req.json();

    if (!email || !vercel_id) {
      return NextResponse.json(
        { error: 'Email and vercel_id are required' },
        { status: 400 }
      );
    }

    const VERCEL_TOKEN = process.env.VERCELTOKEN;

    if (!VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel token not configured' },
        { status: 500 }
      );
    }

    await connectDB();

    // Verify the deployment exists and belongs to this user
    const client = await Client.findOne({
      email,
      'Deployments.vercel_id': vercel_id
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Deployment not found for this user' },
        { status: 404 }
      );
    }

    // Add SMAKSLY_ID environment variable to the Vercel project
    const envRes = await fetch(
      `https://api.vercel.com/v10/projects/${vercel_id}/env`,
      {
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
      }
    );

    const envData = await envRes.json();

    // If env var already exists, try to update it
    if (!envRes.ok && envData.error?.code === 'ENV_ALREADY_EXISTS') {
      // Get existing env vars to find the ID
      const listRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercel_id}/env`,
        {
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
          },
        }
      );
      const listData = await listRes.json();
      const existingEnv = listData.envs?.find(
        (env: any) => env.key === 'SMAKSLY_ID'
      );

      if (existingEnv) {
        // Update existing env var
        await fetch(
          `https://api.vercel.com/v10/projects/${vercel_id}/env/${existingEnv.id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: vercel_id,
            }),
          }
        );
      }
    }

    // Trigger a redeploy by creating a new deployment
    // First, get the project to find the git repo
    const projectRes = await fetch(
      `https://api.vercel.com/v9/projects/${vercel_id}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!projectRes.ok) {
      return NextResponse.json(
        { error: 'Failed to get project info', success: false },
        { status: 500 }
      );
    }

    const projectData = await projectRes.json();

    // Get the latest deployment and redeploy
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectData.id}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (deploymentsRes.ok) {
      const deploymentsData = await deploymentsRes.json();
      const latestDeployment = deploymentsData.deployments?.[0];

      if (latestDeployment) {
        // Trigger redeploy
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
              ref: projectData.link?.productionBranch || 'main',
            },
          }),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Environment variable added and redeploy triggered',
    });
  } catch (error: any) {
    console.error('Update deployment env error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update deployment' },
      { status: 500 }
    );
  }
}
