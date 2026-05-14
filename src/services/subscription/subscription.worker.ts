import { Queue, Worker, Job } from "bullmq";
import { REDIS_CONFIG } from "../../config/redis.config";
import SubscriptionModel from "../../models/subscription/subscription.model";
import PaymentModel from "../../models/payment/payment.model";
import { createRazorpayOrder, verifyRazorpaySignature } from "../razorpay/razorpay.service";
import { PLAN_CONFIG, SubscriptionPlan } from "../../types/interface/subscription.interface";

const SUBSCRIPTION_QUEUE = "subscription-management-queue";

let subscriptionQueue: Queue | null = null;
let subscriptionWorker: Worker | null = null;

/**
 * Get or create the subscription queue
 */
export const getSubscriptionQueue = async (): Promise<Queue> => {
  if (!subscriptionQueue) {
    subscriptionQueue = new Queue(SUBSCRIPTION_QUEUE, {
      connection: REDIS_CONFIG,
    });
  }
  return subscriptionQueue;
};

/**
 * Schedule a subscription renewal check
 */
export const scheduleRenewal = async (subscriptionId: string, renewAt: Date) => {
  const queue = await getSubscriptionQueue();
  const delay = renewAt.getTime() - Date.now();

  if (delay <= 0) {
    // Already past due, process immediately
    await queue.add(
      "process-renewal",
      { subscriptionId, type: "renewal" },
      { jobId: `renewal-${subscriptionId}` }
    );
  } else {
    await queue.add(
      "process-renewal",
      { subscriptionId, type: "renewal" },
      {
        delay,
        jobId: `renewal-${subscriptionId}`,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }

  console.log(`[Subscription] Renewal scheduled for ${subscriptionId} at ${renewAt.toISOString()}`);
};

/**
 * Schedule a cancellation at period end
 */
export const scheduleCancellation = async (subscriptionId: string, cancelAt: Date) => {
  const queue = await getSubscriptionQueue();
  const delay = cancelAt.getTime() - Date.now();

  await queue.add(
    "process-cancellation",
    { subscriptionId, type: "cancellation" },
    {
      delay: Math.max(delay, 0),
      jobId: `cancel-${subscriptionId}`,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  console.log(`[Subscription] Cancellation scheduled for ${subscriptionId} at ${cancelAt.toISOString()}`);
};

/**
 * Process subscription renewal
 */
const processRenewal = async (subscriptionId: string) => {
  const subscription = await SubscriptionModel.findById(subscriptionId);
  if (!subscription) {
    console.warn(`[Subscription] Subscription ${subscriptionId} not found`);
    return;
  }

  if (subscription.status !== "active" || subscription.cancel_at_period_end) {
    console.log(`[Subscription] Skipping renewal for ${subscriptionId} - status: ${subscription.status}`);
    return;
  }

  // Free plan doesn't need renewal payment
  if (subscription.plan === "free") {
    const now = new Date();
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    subscription.current_period_start = now;
    subscription.current_period_end = nextPeriodEnd;
    await subscription.save();

    // Schedule next renewal
    await scheduleRenewal(subscriptionId, nextPeriodEnd);
    console.log(`[Subscription] Free plan renewed for ${subscriptionId}`);
    return;
  }

  // For paid plans: create a new Razorpay order for auto-renewal
  const planConfig = PLAN_CONFIG[subscription.plan];
  const receipt = `rnw_${subscriptionId.slice(-8)}_${Date.now().toString(36)}`;

  try {
    const order = await createRazorpayOrder(
      planConfig.price,
      subscription.currency,
      receipt,
      {
        subscription_id: subscriptionId,
        plan: subscription.plan,
        type: "auto_renewal",
      }
    );

    // Create payment record
    await PaymentModel.create({
      user_id: subscription.company_id, // billing tied to company
      company_id: subscription.company_id,
      subscription_id: subscription._id,
      razorpay_order_id: order.id,
      amount: planConfig.price,
      currency: subscription.currency,
      status: "created",
      plan: subscription.plan,
      receipt,
    });

    // Mark as past_due until payment is confirmed
    subscription.status = "past_due";
    await subscription.save();

    console.log(`[Subscription] Renewal order created for ${subscriptionId}: ${order.id}`);
  } catch (error) {
    console.error(`[Subscription] Renewal failed for ${subscriptionId}:`, error);
    subscription.status = "past_due";
    await subscription.save();
  }
};

/**
 * Process subscription cancellation
 */
const processCancellation = async (subscriptionId: string) => {
  const subscription = await SubscriptionModel.findById(subscriptionId);
  if (!subscription) return;

  // Downgrade to free plan
  subscription.plan = "free";
  subscription.status = "active";
  subscription.amount = 0;
  subscription.cancel_at_period_end = false;
  subscription.cancelled_at = new Date();

  const now = new Date();
  const nextPeriodEnd = new Date(now);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
  subscription.current_period_start = now;
  subscription.current_period_end = nextPeriodEnd;

  await subscription.save();
  console.log(`[Subscription] Cancelled and downgraded to free: ${subscriptionId}`);
};

/**
 * Initialize the subscription worker
 */
export const initializeSubscriptionWorker = async (): Promise<Worker | null> => {
  try {
    subscriptionWorker = new Worker(
      SUBSCRIPTION_QUEUE,
      async (job: Job) => {
        const { subscriptionId, type } = job.data;
        console.log(`[Subscription Worker] Processing job: ${type} for ${subscriptionId}`);

        switch (type) {
          case "renewal":
            await processRenewal(subscriptionId);
            break;
          case "cancellation":
            await processCancellation(subscriptionId);
            break;
          default:
            console.warn(`[Subscription Worker] Unknown job type: ${type}`);
        }
      },
      {
        connection: REDIS_CONFIG,
        concurrency: 5,
      }
    );

    subscriptionWorker.on("completed", (job) => {
      console.log(`[Subscription Worker] Job ${job.id} completed`);
    });

    subscriptionWorker.on("failed", (job, err) => {
      console.error(`[Subscription Worker] Job ${job?.id} failed:`, err.message);
    });

    return subscriptionWorker;
  } catch (error) {
    console.warn("[Subscription Worker] Initialization skipped - Redis not available");
    return null;
  }
};
