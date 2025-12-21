import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User, Partner } from '@/models';
import { isValidEmail, isValidPassword, sanitizeString, checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`partner-register:${ip}`, 5, 3600000); // 5 attempts per hour

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    await connectDB();

    const body = await req.json();
    const {
      email,
      password,
      name,
      companyName,
      contactPhone,
      website,
    } = body;

    // Validate required fields
    const emailClean = sanitizeString(email || '').toLowerCase();
    const nameClean = sanitizeString(name || '');

    if (!emailClean || !isValidEmail(emailClean)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address' },
        { status: 400 }
      );
    }

    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }

    if (!nameClean || nameClean.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid name' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: emailClean });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email: emailClean,
      password: hashedPassword,
      name: nameClean,
      role: 'partner',
      isActive: true,
      isEmailVerified: false,
    });

    // Create partner profile
    const partner = await Partner.create({
      userId: user._id,
      contactName: nameClean,
      contactEmail: emailClean,
      contactPhone: sanitizeString(contactPhone || ''),
      companyName: sanitizeString(companyName || ''),
      website: sanitizeString(website || ''),
      status: 'pending', // Requires admin approval
      tier: 'basic',
      commissionRate: 70,
      preferences: {
        emailNotifications: true,
        orderUpdates: true,
        promotionalEmails: false,
        weeklyDigest: true,
      },
    });

    // Link partner to user
    await User.findByIdAndUpdate(user._id, { partnerId: partner._id });

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      data: {
        userId: user._id,
        partnerId: partner._id,
        email: user.email,
        status: partner.status,
      },
    });
  } catch (error) {
    console.error('Partner registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
