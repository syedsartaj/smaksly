import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { User, Partner } from '@/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface PartnerSession {
  userId: string;
  partnerId: string;
  email: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  partner: {
    id: string;
    status: string;
    tier: string;
    companyName?: string;
  };
}

export async function getPartnerSession(req: NextRequest): Promise<PartnerSession | null> {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.get('partner_token')?.value ||
      req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      partnerId: string;
      email: string;
      role: string;
    };

    await connectDB();

    // Get user and partner data
    const [user, partner] = await Promise.all([
      User.findById(decoded.userId).select('-password').lean(),
      Partner.findById(decoded.partnerId).lean(),
    ]);

    if (!user || !partner) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    if (partner.status === 'banned' || partner.status === 'suspended') {
      return null;
    }

    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email,
      role: decoded.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
      partner: {
        id: partner._id.toString(),
        status: partner.status,
        tier: partner.tier,
        companyName: partner.companyName,
      },
    };
  } catch {
    return null;
  }
}

export function requirePartnerAuth(
  handler: (req: NextRequest, session: PartnerSession) => Promise<Response>
) {
  return async (req: NextRequest) => {
    const session = await getPartnerSession(req);

    if (!session) {
      return Response.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(req, session);
  };
}
