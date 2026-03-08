import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { sendEmail } from '@/lib/email/smtp-send';

// POST — send email via SMTP
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { accountId, to, cc, subject, body: emailBody, bodyText, inReplyTo, threadId } = body;

    if (!accountId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'accountId, to, subject, and body are required' },
        { status: 400 }
      );
    }

    const toList = Array.isArray(to) ? to : [to];

    const result = await sendEmail({
      accountId,
      to: toList,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      subject,
      body: emailBody,
      bodyText,
      inReplyTo,
      threadId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { messageId: result.messageId },
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
