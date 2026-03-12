import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { BuilderProject } from '@/models';
import mongoose from 'mongoose';
import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST - Verify DNS records for a domain
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { projectId } = await params;
    const { domain } = await req.json();

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ success: false, error: 'Domain is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const project = await BuilderProject.findById(projectId).lean();
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

    // Get domain config from Vercel to check what records are needed
    const vercelRes = await fetch(
      `https://api.vercel.com/v9/projects/${project.vercelProjectId}/domains/${domain}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );

    let vercelDomain = null;
    if (vercelRes.ok) {
      vercelDomain = await vercelRes.json();
    }

    // Also check domain configuration via Vercel's config endpoint
    const configRes = await fetch(
      `https://api.vercel.com/v6/domains/${domain}/config`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );

    let domainConfig = null;
    if (configRes.ok) {
      domainConfig = await configRes.json();
    }

    // Perform our own DNS verification
    const verificationResults = await verifyDnsRecords(domain, project.gitRepoName || '');

    // Determine overall status
    const isConfigured = vercelDomain?.verified === true ||
      domainConfig?.misconfigured === false ||
      verificationResults.cnameValid ||
      verificationResults.aRecordValid;

    return NextResponse.json({
      success: true,
      data: {
        domain,
        verified: isConfigured,
        dns: verificationResults,
        vercel: {
          configured: vercelDomain?.verified ?? null,
          misconfigured: domainConfig?.misconfigured ?? null,
        },
        requiredRecords: getRequiredRecords(domain, project.gitRepoName || ''),
        message: isConfigured
          ? 'DNS records are configured correctly. Your domain is active.'
          : 'DNS records are not configured yet. Please add the required records at your domain registrar.',
      },
    });
  } catch (error) {
    console.error('Error verifying domain DNS:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify DNS' }, { status: 500 });
  }
}

/**
 * Verify DNS records for a domain
 */
async function verifyDnsRecords(domain: string, repoName: string) {
  const results = {
    cnameValid: false,
    cnameFound: null as string | null,
    aRecordValid: false,
    aRecordsFound: [] as string[],
    txtRecordsFound: [] as string[],
    nameservers: [] as string[],
    isCloudflare: false,
    error: null as string | null,
  };

  // Check CNAME record
  try {
    const cnameRecords = await resolveCname(domain);
    if (cnameRecords && cnameRecords.length > 0) {
      results.cnameFound = cnameRecords[0];
      // Vercel CNAME target is cname.vercel-dns.com or the project's .vercel.app domain
      results.cnameValid = cnameRecords.some(
        (r) =>
          r.endsWith('.vercel-dns.com') ||
          r.endsWith('.vercel.app') ||
          r === 'cname.vercel-dns.com.'
      );
    }
  } catch (err: unknown) {
    const dnsErr = err as { code?: string };
    if (dnsErr.code !== 'ENODATA' && dnsErr.code !== 'ENOTFOUND') {
      results.error = `CNAME lookup failed: ${dnsErr.code}`;
    }
  }

  // Check A records (for apex domains that can't use CNAME)
  try {
    const aRecords = await resolve4(domain);
    results.aRecordsFound = aRecords;
    // Vercel's A record IP is 76.76.21.21
    results.aRecordValid = aRecords.includes('76.76.21.21');
  } catch (err: unknown) {
    const dnsErr = err as { code?: string };
    if (dnsErr.code !== 'ENODATA' && dnsErr.code !== 'ENOTFOUND') {
      // A record lookup failure is fine if CNAME exists
    }
  }

  // Check TXT records (for ownership verification)
  try {
    const txtRecords = await resolveTxt(domain);
    results.txtRecordsFound = txtRecords.flat();
  } catch {
    // TXT lookup failure is non-critical
  }

  // Check nameservers to detect Cloudflare
  try {
    const resolveNs = promisify(dns.resolveNs);
    // Get root domain for NS lookup
    const parts = domain.split('.');
    const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : domain;
    const nsRecords = await resolveNs(rootDomain);
    results.nameservers = nsRecords;
    results.isCloudflare = nsRecords.some((ns) => ns.includes('cloudflare'));
  } catch {
    // NS lookup failure is non-critical
  }

  return results;
}

/**
 * Get required DNS records for the user to configure
 */
function getRequiredRecords(domain: string, repoName: string) {
  const parts = domain.split('.');
  const isApex = parts.length === 2; // e.g., example.com (no subdomain)

  if (isApex) {
    return [
      {
        type: 'A',
        name: '@',
        value: '76.76.21.21',
        description: 'Points your domain to Vercel',
        required: true,
      },
      {
        type: 'AAAA',
        name: '@',
        value: '2606:50c0:8000::1a',
        description: 'IPv6 support (optional but recommended)',
        required: false,
      },
    ];
  }

  // Subdomain (e.g., www.example.com, blog.example.com)
  return [
    {
      type: 'CNAME',
      name: parts[0], // e.g., "www" or "blog"
      value: 'cname.vercel-dns.com',
      description: 'Points your subdomain to Vercel',
      required: true,
    },
  ];
}
