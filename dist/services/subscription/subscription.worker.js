"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSubscriptionWorker = exports.scheduleCancellation = exports.scheduleRenewal = exports.getSubscriptionQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_config_1 = require("../../config/redis.config");
const subscription_model_1 = __importDefault(require("../../models/subscription/subscription.model"));
const payment_model_1 = __importDefault(require("../../models/payment/payment.model"));
const razorpay_service_1 = require("../razorpay/razorpay.service");
const subscription_interface_1 = require("../../types/interface/subscription.interface");
const SUBSCRIPTION_QUEUE = "subscription-management-queue";
let subscriptionQueue = null;
let subscriptionWorker = null;
/**
 * Get or create the subscription queue
 */
const getSubscriptionQueue = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!subscriptionQueue) {
        subscriptionQueue = new bullmq_1.Queue(SUBSCRIPTION_QUEUE, {
            connection: redis_config_1.REDIS_CONFIG,
        });
    }
    return subscriptionQueue;
});
exports.getSubscriptionQueue = getSubscriptionQueue;
/**
 * Schedule a subscription renewal check
 */
const scheduleRenewal = (subscriptionId, renewAt) => __awaiter(void 0, void 0, void 0, function* () {
    const queue = yield (0, exports.getSubscriptionQueue)();
    const delay = renewAt.getTime() - Date.now();
    if (delay <= 0) {
        // Already past due, process immediately
        yield queue.add("process-renewal", { subscriptionId, type: "renewal" }, { jobId: `renewal-${subscriptionId}` });
    }
    else {
        yield queue.add("process-renewal", { subscriptionId, type: "renewal" }, {
            delay,
            jobId: `renewal-${subscriptionId}`,
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
    console.log(`[Subscription] Renewal scheduled for ${subscriptionId} at ${renewAt.toISOString()}`);
});
exports.scheduleRenewal = scheduleRenewal;
/**
 * Schedule a cancellation at period end
 */
const scheduleCancellation = (subscriptionId, cancelAt) => __awaiter(void 0, void 0, void 0, function* () {
    const queue = yield (0, exports.getSubscriptionQueue)();
    const delay = cancelAt.getTime() - Date.now();
    yield queue.add("process-cancellation", { subscriptionId, type: "cancellation" }, {
        delay: Math.max(delay, 0),
        jobId: `cancel-${subscriptionId}`,
        removeOnComplete: true,
        removeOnFail: false,
    });
    console.log(`[Subscription] Cancellation scheduled for ${subscriptionId} at ${cancelAt.toISOString()}`);
});
exports.scheduleCancellation = scheduleCancellation;
/**
 * Process subscription renewal
 */
const processRenewal = (subscriptionId) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield subscription_model_1.default.findById(subscriptionId);
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
        yield subscription.save();
        // Schedule next renewal
        yield (0, exports.scheduleRenewal)(subscriptionId, nextPeriodEnd);
        console.log(`[Subscription] Free plan renewed for ${subscriptionId}`);
        return;
    }
    // For paid plans: create a new Razorpay order for auto-renewal
    const planConfig = subscription_interface_1.PLAN_CONFIG[subscription.plan];
    const receipt = `rnw_${subscriptionId.slice(-8)}_${Date.now().toString(36)}`;
    try {
        const order = yield (0, razorpay_service_1.createRazorpayOrder)(planConfig.price, subscription.currency, receipt, {
            subscription_id: subscriptionId,
            plan: subscription.plan,
            type: "auto_renewal",
        });
        // Create payment record
        yield payment_model_1.default.create({
            user_id: subscription.user_id,
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
        yield subscription.save();
        console.log(`[Subscription] Renewal order created for ${subscriptionId}: ${order.id}`);
    }
    catch (error) {
        console.error(`[Subscription] Renewal failed for ${subscriptionId}:`, error);
        subscription.status = "past_due";
        yield subscription.save();
    }
});
/**
 * Process subscription cancellation
 */
const processCancellation = (subscriptionId) => __awaiter(void 0, void 0, void 0, function* () {
    const subscription = yield subscription_model_1.default.findById(subscriptionId);
    if (!subscription)
        return;
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
    yield subscription.save();
    console.log(`[Subscription] Cancelled and downgraded to free: ${subscriptionId}`);
});
/**
 * Initialize the subscription worker
 */
const initializeSubscriptionWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        subscriptionWorker = new bullmq_1.Worker(SUBSCRIPTION_QUEUE, (job) => __awaiter(void 0, void 0, void 0, function* () {
            const { subscriptionId, type } = job.data;
            console.log(`[Subscription Worker] Processing job: ${type} for ${subscriptionId}`);
            switch (type) {
                case "renewal":
                    yield processRenewal(subscriptionId);
                    break;
                case "cancellation":
                    yield processCancellation(subscriptionId);
                    break;
                default:
                    console.warn(`[Subscription Worker] Unknown job type: ${type}`);
            }
        }), {
            connection: redis_config_1.REDIS_CONFIG,
            concurrency: 5,
        });
        subscriptionWorker.on("completed", (job) => {
            console.log(`[Subscription Worker] Job ${job.id} completed`);
        });
        subscriptionWorker.on("failed", (job, err) => {
            console.error(`[Subscription Worker] Job ${job === null || job === void 0 ? void 0 : job.id} failed:`, err.message);
        });
        return subscriptionWorker;
    }
    catch (error) {
        console.warn("[Subscription Worker] Initialization skipped - Redis not available");
        return null;
    }
});
exports.initializeSubscriptionWorker = initializeSubscriptionWorker;
