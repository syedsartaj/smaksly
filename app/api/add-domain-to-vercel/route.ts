import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongo'; // ✅ adjust if your path differs
import User from '@/models/Client'; // ✅ your Mongoose user model
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { domain, vercel_id, email, token } = await req.json();
  const subdomain = `${domain}`;

  // ✅ Add domain to Vercel
  const vercelRes = await fetch(`https://api.vercel.com/v10/projects/${vercel_id}/domains`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCELTOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: subdomain }),
  });
await fetch(`https://api.vercel.com/v10/projects/${vercel_id}/env`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VERCELTOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    key: 'DOMAIN',
    value: `https://${subdomain}`,
    target: ['production'],
    type: 'plain',
  }),
});
console.log(`✅ DOMAIN environment variable updated to: https://${subdomain}`);  const result = await vercelRes.json();
  console.log(result);

  if (!vercelRes.ok) {
    return NextResponse.json({ error: result.error?.message || 'Failed to add domain to Vercel' }, { status: 500 });
  }

  // ✅ Connect to DB and update user's deployment
  await connectToDatabase();

  await User.updateOne(
    { email, 'deployments.vercel_id': vercel_id },
    {
      $set: {
        'deployments.$.DOMAIN': `https://${domain}`,
        //'deployments.$.verification_status': 'verified',
        'deployments.$.verification_token': token,
      },
    }
  );

  return NextResponse.json({ message: 'Domain added and database updated successfully.' });
}
