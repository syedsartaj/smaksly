import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { User, Partner } from '@/models';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

interface JWTPayload {
  userId: string;
  partnerId: string;
  email: string;
  role: string;
}

export async function GET(req: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.get('partner_token')?.value ||
      req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user and partner data
    const [user, partner] = await Promise.all([
      User.findById(decoded.userId).select('-password'),
      Partner.findById(decoded.partnerId),
    ]);

    if (!user || !partner) {
      return NextResponse.json(
        { success: false, error: 'User or partner not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    if (partner.status === 'banned' || partner.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Account is not active' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
        },
        partner: {
          id: partner._id,
          companyName: partner.companyName,
          website: partner.website,
          bio: partner.bio,
          logo: partner.logo,
          contactName: partner.contactName,
          contactEmail: partner.contactEmail,
          contactPhone: partner.contactPhone,
          address: partner.address,
          status: partner.status,
          tier: partner.tier,
          totalOrders: partner.totalOrders,
          totalSpent: partner.totalSpent / 100, // Convert cents to dollars
          averageOrderValue: partner.averageOrderValue / 100,
          preferences: partner.preferences,
          stripeOnboardingComplete: partner.stripeOnboardingComplete,
          lastLoginAt: partner.lastLoginAt,
          createdAt: partner.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching partner profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
