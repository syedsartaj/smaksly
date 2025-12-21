import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongo';
import User from '@/models/Client';
import { isValidEmail, sanitizeString, checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP to prevent brute force attacks
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 300000); // 10 attempts per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    const body = await req.json();
    const email = sanitizeString(body.email || '').toLowerCase();
    const password = body.password || '';

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Please provide a valid password' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });

    // Use constant-time comparison message to prevent user enumeration
    if (!user || !user.password) {
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Don't return sensitive data like password hash
    return NextResponse.json({
      message: 'Login successful',
      user: { email: user.email, role: user.role || 'user' },
      ok: true
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
