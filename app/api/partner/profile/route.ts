import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Partner, User } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';
import { sanitizeString, isValidEmail, isValidUrl } from '@/lib/security';

// GET - Get partner profile
export async function GET(req: NextRequest) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const partner = await Partner.findById(session.partnerId).lean();
    const user = await User.findById(session.userId).select('-password').lean();

    if (!partner || !user) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
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
          totalSpent: partner.totalSpent / 100,
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

// PUT - Update partner profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    // Validate and sanitize inputs
    const updates: Record<string, unknown> = {};

    if (body.companyName !== undefined) {
      updates.companyName = sanitizeString(body.companyName);
    }

    if (body.website !== undefined) {
      const website = sanitizeString(body.website);
      if (website && !isValidUrl(`https://${website.replace(/^https?:\/\//, '')}`)) {
        return NextResponse.json(
          { success: false, error: 'Invalid website URL' },
          { status: 400 }
        );
      }
      updates.website = website;
    }

    if (body.bio !== undefined) {
      updates.bio = sanitizeString(body.bio).substring(0, 500);
    }

    if (body.contactName !== undefined) {
      const contactName = sanitizeString(body.contactName);
      if (!contactName || contactName.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Contact name is required' },
          { status: 400 }
        );
      }
      updates.contactName = contactName;
    }

    if (body.contactEmail !== undefined) {
      const contactEmail = sanitizeString(body.contactEmail).toLowerCase();
      if (!isValidEmail(contactEmail)) {
        return NextResponse.json(
          { success: false, error: 'Invalid contact email' },
          { status: 400 }
        );
      }
      updates.contactEmail = contactEmail;
    }

    if (body.contactPhone !== undefined) {
      updates.contactPhone = sanitizeString(body.contactPhone);
    }

    if (body.address !== undefined) {
      updates.address = {
        street: sanitizeString(body.address.street || ''),
        city: sanitizeString(body.address.city || ''),
        state: sanitizeString(body.address.state || ''),
        country: sanitizeString(body.address.country || ''),
        postalCode: sanitizeString(body.address.postalCode || ''),
      };
    }

    if (body.preferences !== undefined) {
      updates.preferences = {
        emailNotifications: Boolean(body.preferences.emailNotifications),
        orderUpdates: Boolean(body.preferences.orderUpdates),
        promotionalEmails: Boolean(body.preferences.promotionalEmails),
        weeklyDigest: Boolean(body.preferences.weeklyDigest),
      };
    }

    if (body.logo !== undefined) {
      updates.logo = sanitizeString(body.logo);
    }

    // Update user name if provided
    if (body.name !== undefined) {
      const name = sanitizeString(body.name);
      if (name && name.length >= 2) {
        await User.findByIdAndUpdate(session.userId, { name });
      }
    }

    // Update user avatar if provided
    if (body.avatar !== undefined) {
      await User.findByIdAndUpdate(session.userId, { avatar: sanitizeString(body.avatar) });
    }

    updates.updatedAt = new Date();

    const partner = await Partner.findByIdAndUpdate(
      session.partnerId,
      updates,
      { new: true }
    ).lean();

    const user = await User.findById(session.userId).select('-password').lean();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user!._id,
          email: user!.email,
          name: user!.name,
          avatar: user!.avatar,
        },
        partner: {
          id: partner!._id,
          companyName: partner!.companyName,
          website: partner!.website,
          bio: partner!.bio,
          contactName: partner!.contactName,
          contactEmail: partner!.contactEmail,
          contactPhone: partner!.contactPhone,
          address: partner!.address,
          preferences: partner!.preferences,
        },
      },
    });
  } catch (error) {
    console.error('Error updating partner profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
