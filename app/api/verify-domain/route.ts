// app/api/verify-domain/route.ts
import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export async function POST(req: Request) {
  try {
    const { domain, token } = await req.json();
    const sanitizedDomain = domain.replace(/^https?:\/\//, '');
    const txtName = `_vercel-smaksly.${sanitizedDomain}`;

    console.log(`Checking TXT record for: ${txtName}`);

    const records = await dns.resolveTxt(txtName);

    console.log('TXT records found:', records);

    const flatRecords = records.flat();
    const found = flatRecords.includes(token);

    console.log(`Token match: ${found}`);

    return NextResponse.json({ verified: found });
  } catch (e: any) {
    console.error('DNS lookup failed:', e.message || e);
    return NextResponse.json({ verified: false });
  }
}
