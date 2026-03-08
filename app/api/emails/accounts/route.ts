import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EmailAccount } from '@/models/EmailAccount';
import { Website } from '@/models';
import { encryptPassword } from '@/lib/email/crypto';
import { testSmtpConnection } from '@/lib/email/smtp-send';
import mongoose from 'mongoose';

// GET — list all email accounts grouped by website
export async function GET() {
  try {
    await connectDB();

    const accounts = await EmailAccount.find()
      .sort({ createdAt: -1 })
      .lean();

    // Group by websiteId
    const websiteIds = [...new Set(accounts.map((a) => a.websiteId.toString()))];
    const websites = await Website.find({ _id: { $in: websiteIds } })
      .select('domain name')
      .lean();

    const websiteMap = new Map(websites.map((w) => [w._id.toString(), w]));

    // Count unread per account
    const { Email } = await import('@/models/Email');
    const unreadCounts = await Email.aggregate([
      { $match: { accountId: { $in: accounts.map((a) => a._id) }, isRead: false, folder: 'inbox' } },
      { $group: { _id: '$accountId', count: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

    const grouped = websiteIds.map((wId) => {
      const website = websiteMap.get(wId);
      return {
        websiteId: wId,
        domain: website?.domain || 'Unknown',
        websiteName: website?.name || website?.domain || 'Unknown',
        accounts: accounts
          .filter((a) => a.websiteId.toString() === wId)
          .map((a) => ({
            _id: a._id,
            email: a.email,
            displayName: a.displayName,
            status: a.status,
            lastSyncAt: a.lastSyncAt,
            errorMessage: a.errorMessage,
            unreadCount: unreadMap.get(a._id.toString()) || 0,
          })),
      };
    });

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email accounts' },
      { status: 500 }
    );
  }
}

// POST — add new email account
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { websiteId, email, displayName, imapHost, imapPort, smtpHost, smtpPort, username, password } = body;

    if (!websiteId || !email || !imapHost || !smtpHost || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(websiteId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid website ID' },
        { status: 400 }
      );
    }

    // Test SMTP connection before saving
    const smtpTest = await testSmtpConnection({
      host: smtpHost,
      port: smtpPort || 587,
      username,
      password,
    });

    if (!smtpTest.success) {
      return NextResponse.json(
        { success: false, error: `SMTP connection failed: ${smtpTest.error}` },
        { status: 400 }
      );
    }

    // Encrypt password
    const encrypted = encryptPassword(password);

    const account = await EmailAccount.create({
      websiteId: new mongoose.Types.ObjectId(websiteId),
      email: email.toLowerCase().trim(),
      displayName: displayName || '',
      imapHost,
      imapPort: imapPort || 993,
      smtpHost,
      smtpPort: smtpPort || 587,
      username,
      passwordEncrypted: encrypted.encrypted,
      passwordIv: encrypted.iv,
      passwordTag: encrypted.tag,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: account._id,
        email: account.email,
        displayName: account.displayName,
        status: account.status,
      },
      message: 'Email account added successfully',
    });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Email account already exists for this website' },
        { status: 409 }
      );
    }
    console.error('Error creating email account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create email account' },
      { status: 500 }
    );
  }
}
