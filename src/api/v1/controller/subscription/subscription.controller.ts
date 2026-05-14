import { Request, Response } from "express";
import SubscriptionModel from "../../../../models/subscription/subscription.model";
import PaymentModel from "../../../../models/payment/payment.model";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
} from "../../../../services/razorpay/razorpay.service";
import {
  scheduleRenewal,
  scheduleCancellation,
} from "../../../../services/subscription/subscription.worker";
import {
  PLAN_CONFIG,
  SubscriptionPlan,
} from "../../../../types/interface/subscription.interface";

/**
 * Helper: get or create the single subscription doc for a company.
 * Lets Mongoose handle ObjectId casting via the schema definition.
 */
async function getOrCreateCompanySubscription(companyId: string) {
  // First, try to find existing subscription
  let sub = await SubscriptionModel.findOne({ company_id: companyId });
  
  if (sub) return sub;

  // No subscription exists — create one
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  try {
    sub = await SubscriptionModel.create({
      company_id: companyId,
      plan: "free",
      status: "active",
      amount: 0,
      currency: "INR",
      current_period_start: now,
      current_period_end: periodEnd,
    });
    return sub;
  } catch (err: any) {
    // E11000 = another request created it first (race condition), just fetch it
    if (err.code === 11000) {
      return SubscriptionModel.findOne({ company_id: companyId });
    }
    throw err;
  }
}

/**
 * GET /subscription/current - Get the organization's subscription
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.company_object_id;
    const subscription = await getOrCreateCompanySubscription(companyId);
    res.status(200).json({ success: true, data: subscription });
  } catch (error: any) {
    console.error("getCurrentSubscription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/create-order - Create Razorpay order for plan upgrade
 */
export const createSubscriptionOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const companyId = (req as any).user.company_object_id;
    const { plan } = req.body as { plan: SubscriptionPlan };

    if (!plan || !PLAN_CONFIG[plan]) {
      res.status(400).json({ success: false, message: "Invalid plan" });
      return;
    }

    const planConfig = PLAN_CONFIG[plan];

    if (planConfig.price === 0) {
      res.status(400).json({ success: false, message: "Free plan doesn't require payment" });
      return;
    }

    const shortId = companyId.toString().slice(-8);
    const receipt = `sub_${shortId}_${Date.now().toString(36)}`;

    const order = await createRazorpayOrder(
      planConfig.price,
      "INR",
      receipt,
      { company_id: companyId.toString(), plan }
    );

    // Ensure subscription doc exists
    const subscription = await getOrCreateCompanySubscription(companyId);

    if (!subscription) {
      res.status(500).json({ success: false, message: "Failed to initialize subscription" });
      return;
    }

    // Create payment record
    const payment = await PaymentModel.create({
      user_id: userId,
      company_id: companyId,
      subscription_id: subscription._id,
      razorpay_order_id: order.id,
      amount: planConfig.price,
      currency: "INR",
      status: "created",
      plan,
      receipt,
    });

    res.status(200).json({
      success: true,
      data: {
        order_id: order.id,
        amount: planConfig.price,
        currency: "INR",
        plan,
        plan_name: planConfig.name,
        payment_id: payment._id,
        key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SYlbshsg5rKnuO",
      },
    });
  } catch (error: any) {
    console.error("createSubscriptionOrder error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/verify-payment - Verify Razorpay payment and activate plan
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.company_object_id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ success: false, message: "Missing payment details" });
      return;
    }

    // Verify signature
    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await PaymentModel.findOneAndUpdate(
        { razorpay_order_id },
        { status: "failed", failure_reason: "Signature verification failed" }
      );
      res.status(400).json({ success: false, message: "Payment verification failed" });
      return;
    }

    // Update payment record
    const payment = await PaymentModel.findOneAndUpdate(
      { razorpay_order_id },
      {
        razorpay_payment_id,
        razorpay_signature,
        status: "captured",
        paid_at: new Date(),
      },
      { new: true }
    );

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment record not found" });
      return;
    }

    // Update the single company subscription doc
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await SubscriptionModel.findOneAndUpdate(
      { company_id: companyId },
      {
        plan: plan as SubscriptionPlan,
        status: "active",
        amount: PLAN_CONFIG[plan as SubscriptionPlan].price,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        cancelled_at: null,
      },
      { new: true, upsert: true }
    );

    // Schedule auto-renewal
    if (subscription) {
      try {
        await scheduleRenewal(subscription._id.toString(), periodEnd);
      } catch (e) {
        console.warn("[Subscription] Could not schedule renewal - Redis may be unavailable");
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      data: subscription,
    });
  } catch (error: any) {
    console.error("verifyPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/cancel - Cancel subscription at period end
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.company_object_id;

    const subscription = await SubscriptionModel.findOne({
      company_id: companyId,
      status: "active",
    });

    if (!subscription) {
      res.status(404).json({ success: false, message: "No active subscription found" });
      return;
    }

    if (subscription.plan === "free") {
      res.status(400).json({ success: false, message: "Cannot cancel free plan" });
      return;
    }

    subscription.cancel_at_period_end = true;
    await subscription.save();

    try {
      await scheduleCancellation(
        subscription._id.toString(),
        subscription.current_period_end
      );
    } catch (e) {
      console.warn("[Subscription] Could not schedule cancellation - Redis may be unavailable");
    }

    res.status(200).json({
      success: true,
      message: `Subscription will be cancelled at ${subscription.current_period_end.toISOString()}`,
      data: subscription,
    });
  } catch (error: any) {
    console.error("cancelSubscription error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /subscription/downgrade-to-free - Immediately switch to free
 */
export const downgradeToFree = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.company_object_id;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await SubscriptionModel.findOneAndUpdate(
      { company_id: companyId },
      {
        plan: "free",
        status: "active",
        amount: 0,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        cancelled_at: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Downgraded to free plan",
      data: subscription,
    });
  } catch (error: any) {
    console.error("downgradeToFree error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /subscription/payments - Get payment history for the organization
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user.company_object_id;

    const payments = await PaymentModel.find({ company_id: companyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    console.error("getPaymentHistory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /subscription/plans - Get available plans
 */
export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = Object.entries(PLAN_CONFIG).map(([key, config]) => ({
      id: key,
      ...config,
      price_display: config.price === 0 ? "Free" : `₹${config.price / 100}/mo`,
    }));

    res.status(200).json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
