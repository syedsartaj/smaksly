import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
export const EMAIL_TEMPLATES = {
  // Partner emails
  PARTNER_WELCOME: 'partner_welcome',
  PARTNER_ORDER_CONFIRMATION: 'partner_order_confirmation',
  PARTNER_ORDER_PUBLISHED: 'partner_order_published',
  PARTNER_POST_EXPIRING: 'partner_post_expiring',
  PARTNER_POST_EXPIRED: 'partner_post_expired',

  // Admin emails
  ADMIN_NEW_ORDER: 'admin_new_order',
  ADMIN_GUEST_POST_SUBMITTED: 'admin_guest_post_submitted',
  ADMIN_PAYOUT_REQUEST: 'admin_payout_request',

  // System emails
  SYSTEM_PENALTY_ALERT: 'system_penalty_alert',
  SYSTEM_INDEXING_ISSUE: 'system_indexing_issue',
  SYSTEM_WEBSITE_DOWN: 'system_website_down',
} as const;

// From email address
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@smaksly.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Smaksly';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

// Generic send email function
export const sendEmail = async (options: SendEmailOptions) => {
  const { to, subject, html, text, replyTo, tags } = options;

  return resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    replyTo,
    tags,
  });
};

// Partner Welcome Email
export const sendPartnerWelcomeEmail = async (email: string, name: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #10b981;">Welcome to Smaksly, ${name}!</h1>
      <p>Thank you for joining our guest post marketplace. You now have access to:</p>
      <ul>
        <li>Browse 1000+ high-quality websites</li>
        <li>Filter by niche, DA/DR, traffic, and more</li>
        <li>Purchase guest post placements</li>
        <li>Track your orders and posts</li>
      </ul>
      <p>Ready to get started?</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/browse"
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Browse Websites
      </a>
      <p style="margin-top: 24px; color: #666;">
        If you have any questions, just reply to this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Smaksly - Guest Post Marketplace',
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.PARTNER_WELCOME }],
  });
};

// Order Confirmation Email
export const sendOrderConfirmationEmail = async (
  email: string,
  orderDetails: {
    orderId: string;
    websites: Array<{ name: string; domain: string; price: number }>;
    total: number;
  }
) => {
  const websitesList = orderDetails.websites
    .map((w) => `<li>${w.name} (${w.domain}) - $${(w.price / 100).toFixed(2)}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #10b981;">Order Confirmed!</h1>
      <p>Your order <strong>#${orderDetails.orderId}</strong> has been confirmed.</p>

      <h3>Order Details:</h3>
      <ul>${websitesList}</ul>

      <p style="font-size: 18px; font-weight: bold;">
        Total: $${(orderDetails.total / 100).toFixed(2)}
      </p>

      <h3>Next Steps:</h3>
      <ol>
        <li>Submit your guest post content for each website</li>
        <li>Our team will review and publish within the turnaround time</li>
        <li>You'll receive a notification when your post goes live</li>
      </ol>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderDetails.orderId}"
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Order
      </a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmed - #${orderDetails.orderId}`,
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.PARTNER_ORDER_CONFIRMATION }],
  });
};

// Post Published Email
export const sendPostPublishedEmail = async (
  email: string,
  details: {
    websiteName: string;
    postTitle: string;
    postUrl: string;
    expiryDate?: string;
  }
) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #10b981;">Your Guest Post is Live!</h1>
      <p>Great news! Your guest post has been published on <strong>${details.websiteName}</strong>.</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Title:</strong> ${details.postTitle}</p>
        <p style="margin: 8px 0 0;"><strong>URL:</strong> <a href="${details.postUrl}">${details.postUrl}</a></p>
        ${details.expiryDate ? `<p style="margin: 8px 0 0;"><strong>Expires:</strong> ${details.expiryDate}</p>` : ''}
      </div>

      <a href="${details.postUrl}"
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Your Post
      </a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your Guest Post is Live on ${details.websiteName}`,
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.PARTNER_ORDER_PUBLISHED }],
  });
};

// Post Expiring Warning Email
export const sendPostExpiringEmail = async (
  email: string,
  details: {
    websiteName: string;
    postTitle: string;
    postUrl: string;
    expiryDate: string;
    daysRemaining: number;
  }
) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #f59e0b;">Guest Post Expiring Soon</h1>
      <p>Your guest post on <strong>${details.websiteName}</strong> will expire in <strong>${details.daysRemaining} days</strong>.</p>

      <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Title:</strong> ${details.postTitle}</p>
        <p style="margin: 8px 0 0;"><strong>Expires:</strong> ${details.expiryDate}</p>
      </div>

      <p>Would you like to renew your guest post placement?</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/renew"
         style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Renew Now
      </a>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Guest Post Expiring: ${details.postTitle}`,
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.PARTNER_POST_EXPIRING }],
  });
};

// Admin New Order Notification
export const sendAdminNewOrderEmail = async (
  orderDetails: {
    orderId: string;
    partnerEmail: string;
    websites: Array<{ name: string; domain: string }>;
    total: number;
  }
) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smaksly.com';

  const websitesList = orderDetails.websites
    .map((w) => `<li>${w.name} (${w.domain})</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #10b981;">New Order Received!</h1>
      <p>Order <strong>#${orderDetails.orderId}</strong> from ${orderDetails.partnerEmail}</p>

      <h3>Websites:</h3>
      <ul>${websitesList}</ul>

      <p style="font-size: 18px; font-weight: bold;">
        Total: $${(orderDetails.total / 100).toFixed(2)}
      </p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderDetails.orderId}"
         style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Order
      </a>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Order #${orderDetails.orderId} - $${(orderDetails.total / 100).toFixed(2)}`,
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.ADMIN_NEW_ORDER }],
  });
};

// Penalty Alert Email
export const sendPenaltyAlertEmail = async (
  details: {
    websiteName: string;
    domain: string;
    penaltyType: string;
    detectedAt: string;
  }
) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smaksly.com';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #ef4444;">Penalty Alert!</h1>
      <p>A potential penalty has been detected on one of your websites.</p>

      <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0;"><strong>Website:</strong> ${details.websiteName}</p>
        <p style="margin: 8px 0 0;"><strong>Domain:</strong> ${details.domain}</p>
        <p style="margin: 8px 0 0;"><strong>Type:</strong> ${details.penaltyType}</p>
        <p style="margin: 8px 0 0;"><strong>Detected:</strong> ${details.detectedAt}</p>
      </div>

      <p>Please investigate immediately.</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/seo/penalties"
         style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Details
      </a>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `ALERT: Penalty Detected on ${details.domain}`,
    html,
    tags: [{ name: 'template', value: EMAIL_TEMPLATES.SYSTEM_PENALTY_ALERT }],
  });
};
