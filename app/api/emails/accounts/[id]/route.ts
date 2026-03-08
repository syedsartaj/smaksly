import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EmailAccount } from '@/models/EmailAccount';
import { Email } from '@/models/Email';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE — remove email account and all its emails
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid account ID' }, { status: 400 });
    }

    const account = await EmailAccount.findById(id);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Delete all emails for this account
    await Email.deleteMany({ accountId: new mongoose.Types.ObjectId(id) });
    await EmailAccount.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Email account deleted' });
  } catch (error) {
    console.error('Error deleting email account:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
