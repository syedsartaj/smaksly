import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order, GuestPost } from '@/models';
import { getPartnerSession } from '@/lib/partner-auth';
import mongoose from 'mongoose';

// GET - Get single order details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    const order = await Order.findOne({
      _id: id,
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
    }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get associated guest posts for each item
    const guestPostIds = order.items
      .filter((item) => item.guestPostId)
      .map((item) => item.guestPostId);

    const guestPosts = await GuestPost.find({
      _id: { $in: guestPostIds },
    })
      .select('title status publishedUrl expiresAt')
      .lean();

    const guestPostMap = new Map(guestPosts.map((gp) => [gp._id.toString(), gp]));

    // Transform order for display
    const transformedOrder = {
      id: order._id,
      orderNumber: order.orderNumber,
      items: order.items.map((item) => {
        const guestPost = item.guestPostId ? guestPostMap.get(item.guestPostId.toString()) : null;
        return {
          websiteId: item.websiteId,
          websiteName: item.websiteName,
          websiteDomain: item.websiteDomain,
          price: item.price / 100,
          quantity: item.quantity,
          status: item.status,
          guestPost: guestPost ? {
            id: guestPost._id,
            title: guestPost.title,
            status: guestPost.status,
            publishedUrl: guestPost.publishedUrl,
            expiresAt: guestPost.expiresAt,
          } : null,
        };
      }),
      subtotal: order.subtotal / 100,
      discount: order.discount / 100,
      discountCode: order.discountCode,
      tax: order.tax / 100,
      total: order.total / 100,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      refundAmount: order.refundAmount ? order.refundAmount / 100 : null,
      refundReason: order.refundReason,
      refundedAt: order.refundedAt,
      customerNotes: order.customerNotes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      completedAt: order.completedAt,
    };

    return NextResponse.json({
      success: true,
      data: transformedOrder,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT - Update order (cancel, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPartnerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { action, reason } = body;

    const order = await Order.findOne({
      _id: id,
      partnerId: new mongoose.Types.ObjectId(session.partnerId),
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'cancel':
        // Only allow cancellation of pending/unpaid orders
        if (order.paymentStatus !== 'pending') {
          return NextResponse.json(
            { success: false, error: 'Cannot cancel paid orders. Please request a refund.' },
            { status: 400 }
          );
        }

        order.status = 'cancelled';
        order.internalNotes = `Cancelled by partner: ${reason || 'No reason provided'}`;
        await order.save();

        return NextResponse.json({
          success: true,
          message: 'Order cancelled successfully',
          data: { status: order.status },
        });

      case 'request_refund':
        // Only allow refund requests for paid orders
        if (order.paymentStatus !== 'paid') {
          return NextResponse.json(
            { success: false, error: 'Only paid orders can be refunded' },
            { status: 400 }
          );
        }

        // Check if all items are still pending (not started)
        const hasStartedItems = order.items.some(
          (item) => item.status !== 'pending'
        );

        if (hasStartedItems) {
          return NextResponse.json(
            { success: false, error: 'Cannot refund orders with items already in progress' },
            { status: 400 }
          );
        }

        order.refundReason = reason || 'Partner requested refund';
        order.internalNotes = `${order.internalNotes || ''}\nRefund requested by partner at ${new Date().toISOString()}`;
        await order.save();

        return NextResponse.json({
          success: true,
          message: 'Refund request submitted. Our team will review and process it.',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
