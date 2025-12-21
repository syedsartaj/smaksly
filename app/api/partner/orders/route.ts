import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, Website, Partner, GuestPost } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';
import mongoose from 'mongoose';

// GET - List partner's orders
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query: Record<string, unknown> = {
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
    };

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    // Transform orders for display
    const transformedOrders = orders.map((order) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        websiteName: item.websiteName,
        websiteDomain: item.websiteDomain,
        price: item.price / 100,
        status: item.status,
      })),
      subtotal: order.subtotal / 100,
      discount: order.discount / 100,
      total: order.total / 100,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
    }));

    return NextResponse.json({
      success: true,
      data: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST - Create new order (add items to cart and checkout)
export async function POST(req: NextRequest) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if partner is active
    if (session.partner.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Your account must be active to place orders' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { items, discountCode, customerNotes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Validate and fetch website details
    const websiteIds = items.map((item) => item.websiteId);
    const websites = await Website.find({
      _id: { $in: websiteIds },
      status: 'active',
      acceptsGuestPosts: true,
    }).lean();

    if (websites.length !== websiteIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some websites are no longer available' },
        { status: 400 }
      );
    }

    // Build order items
    const orderItems = items.map((item) => {
      const website = websites.find((w) => w._id.toString() === item.websiteId);
      if (!website) {
        throw new Error(`Website ${item.websiteId} not found`);
      }

      return {
        websiteId: website._id,
        websiteName: website.name,
        websiteDomain: website.domain,
        price: website.guestPostPrice || 0,
        quantity: item.quantity || 1,
        status: 'pending' as const,
      };
    });

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Apply discount if code provided (simplified - you would typically validate against a discounts collection)
    let discount = 0;
    let appliedDiscountCode: string | undefined;

    if (discountCode) {
      // Example discount logic - in production, validate against database
      if (discountCode.toUpperCase() === 'WELCOME10') {
        discount = Math.round(subtotal * 0.1); // 10% off
        appliedDiscountCode = discountCode.toUpperCase();
      } else if (discountCode.toUpperCase() === 'BULK20' && orderItems.length >= 5) {
        discount = Math.round(subtotal * 0.2); // 20% off for 5+ items
        appliedDiscountCode = discountCode.toUpperCase();
      }
    }

    const total = subtotal - discount;

    // Get partner for commission calculation
    const partner = await Partner.findById(session.partnerId);
    const commissionRate = partner?.customCommissionRate ?? partner?.commissionRate ?? 70;
    const platformFee = Math.round(total * ((100 - commissionRate) / 100));
    const partnerPayout = total - platformFee;

    // Get IP and user agent for fraud prevention
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Create order
    const order = await Order.create({
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
      items: orderItems,
      subtotal,
      discount,
      discountCode: appliedDiscountCode,
      tax: 0, // Add tax calculation if needed
      total,
      currency: 'USD',
      platformFee,
      partnerPayout,
      status: 'pending',
      paymentStatus: 'pending',
      customerNotes,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        items: order.items.length,
        subtotal: subtotal / 100,
        discount: discount / 100,
        total: total / 100,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
      message: 'Order created successfully. Proceed to payment.',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
