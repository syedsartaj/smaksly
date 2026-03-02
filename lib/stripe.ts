import Stripe from 'stripe';

// Lazy-init Stripe to avoid build-time env var crashes
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Proxy for backwards compatibility: `stripe.checkout.sessions.create(...)` still works
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const instance = getStripe();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

// Product types for guest posts
export const PRODUCT_TYPES = {
  GUEST_POST: 'guest_post',
  FEATURED_POST: 'featured_guest_post',
  PREMIUM_POST: 'premium_guest_post',
} as const;

// Create a checkout session for guest post purchase
export const createCheckoutSession = async ({
  orderId,
  partnerId,
  items,
  successUrl,
  cancelUrl,
  customerEmail,
}: {
  orderId: string;
  partnerId: string;
  items: Array<{
    websiteId: string;
    websiteName: string;
    price: number; // in cents
    quantity?: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<Stripe.Checkout.Session> => {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `Guest Post - ${item.websiteName}`,
        description: `Guest post placement on ${item.websiteName}`,
        metadata: {
          websiteId: item.websiteId,
          type: PRODUCT_TYPES.GUEST_POST,
        },
      },
      unit_amount: item.price,
    },
    quantity: item.quantity || 1,
  }));

  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata: {
      orderId,
      partnerId,
    },
    payment_intent_data: {
      metadata: {
        orderId,
        partnerId,
      },
    },
  });
};

// Create a Stripe Connect account for partner payouts
export const createConnectAccount = async ({
  email,
  country = 'US',
  businessType = 'individual',
}: {
  email: string;
  country?: string;
  businessType?: 'individual' | 'company';
}): Promise<Stripe.Account> => {
  return stripe.accounts.create({
    type: 'express',
    country,
    email,
    business_type: businessType,
    capabilities: {
      transfers: { requested: true },
    },
  });
};

// Create account link for onboarding
export const createAccountLink = async ({
  accountId,
  refreshUrl,
  returnUrl,
}: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<Stripe.AccountLink> => {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

// Transfer funds to partner (payout)
export const transferToPartner = async ({
  amount,
  partnerId,
  stripeAccountId,
  orderId,
  description,
}: {
  amount: number; // in cents
  partnerId: string;
  stripeAccountId: string;
  orderId: string;
  description?: string;
}): Promise<Stripe.Transfer> => {
  return stripe.transfers.create({
    amount,
    currency: 'usd',
    destination: stripeAccountId,
    metadata: {
      partnerId,
      orderId,
    },
    description: description || `Payout for order ${orderId}`,
  });
};

// Get account balance
export const getAccountBalance = async (accountId?: string): Promise<Stripe.Balance> => {
  if (accountId) {
    return stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  }
  return stripe.balance.retrieve();
};

// List transactions for a partner
export const listPartnerTransactions = async ({
  stripeAccountId,
  limit = 10,
  startingAfter,
}: {
  stripeAccountId: string;
  limit?: number;
  startingAfter?: string;
}): Promise<Stripe.ApiList<Stripe.BalanceTransaction>> => {
  return stripe.balanceTransactions.list(
    {
      limit,
      starting_after: startingAfter,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
};

// Retrieve payment intent
export const getPaymentIntent = async (paymentIntentId: string): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

// Retrieve checkout session
export const getCheckoutSession = async (sessionId: string): Promise<Stripe.Checkout.Session> => {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'payment_intent'],
  });
};

// Create refund
export const createRefund = async ({
  paymentIntentId,
  amount,
  reason,
}: {
  paymentIntentId: string;
  amount?: number; // in cents, full refund if not specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<Stripe.Refund> => {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
    reason,
  });
};

// Webhook signature verification
export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
};

// Calculate platform fee and partner share
export const calculateCommission = (
  totalAmount: number, // in cents
  platformFeePercent: number = 30 // default 30%
): { platformFee: number; partnerShare: number } => {
  const platformFee = Math.round((totalAmount * platformFeePercent) / 100);
  const partnerShare = totalAmount - platformFee;

  return {
    platformFee,
    partnerShare,
  };
};
