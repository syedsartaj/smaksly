import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { User, Partner } from '@/models';
import { isValidEmail, sanitizeString, checkRateLimit } from '@/lib/security';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`partner-login:${ip}`, 10, 300000); // 10 attempts per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    await connectDB();

    const body = await req.json();
    const email = sanitizeString(body.email || '').toLowerCase();
    const password = body.password || '';

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid password' },
        { status: 400 }
      );
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.password) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Prevent timing attacks
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is a partner
    if (user.role !== 'partner') {
      return NextResponse.json(
        { success: false, error: 'This login is for partners only' },
        { status: 403 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Get partner profile
    const partner = await Partner.findOne({ userId: user._id });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner profile not found' },
        { status: 404 }
      );
    }

    // Check partner status
    if (partner.status === 'banned') {
      return NextResponse.json(
        { success: false, error: 'Your account has been banned. Please contact support.' },
        { status: 403 }
      );
    }

    if (partner.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // Update last login
    await Promise.all([
      User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }),
      Partner.findByIdAndUpdate(partner._id, { lastLoginAt: new Date() }),
    ]);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        partnerId: partner._id.toString(),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        partner: {
          id: partner._id,
          companyName: partner.companyName,
          status: partner.status,
          tier: partner.tier,
          totalOrders: partner.totalOrders,
          totalSpent: partner.totalSpent,
        },
        token,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('partner_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Partner login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
