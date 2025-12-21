import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongo';
import Client from '@/models/Client';
import { isValidEmail, isValidPassword, sanitizeString, checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`signup:${ip}`, 5, 300000); // 5 requests per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    const body = await req.json();
    const email = sanitizeString(body.email || '').toLowerCase();
    const password = body.password || '';

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password must be 8-128 characters with uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user exists (case-insensitive)
    const existing = await Client.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Don't reveal if email exists - generic message
      return NextResponse.json({ error: 'Unable to create account. Please try a different email.' }, { status: 400 });
    }

    // Hash password with higher cost factor
    const hashedPassword = await bcrypt.hash(password, 12);

    const newClient = await Client.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      Deployments: [],
    });

    // Don't return the full client object with password hash
    return NextResponse.json({
      message: 'Signup successful',
      user: { email: newClient.email }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'An error occurred during signup' }, { status: 500 });
  }
}
