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
exports.getPlans = exports.getPaymentHistory = exports.downgradeToFree = exports.cancelSubscription = exports.verifyPayment = exports.createSubscriptionOrder = exports.getCurrentSubscription = void 0;
const subscription_model_1 = __importDefault(require("../../../../models/subscription/subscription.model"));
const payment_model_1 = __importDefault(require("../../../../models/payment/payment.model"));
const razorpay_service_1 = require("../../../../services/razorpay/razorpay.service");
const subscription_worker_1 = require("../../../../services/subscription/subscription.worker");
const subscription_interface_1 = require("../../../../types/interface/subscription.interface");
/**
 * GET /subscription/current - Get current user's subscription
 */
const getCurrentSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        let subscription = yield subscription_model_1.default.findOne({
            user_id: userId,
            status: { $in: ["active", "past_due"] },
        }).sort({ createdAt: -1 });
        // If no subscription, auto-create a free plan
        if (!subscription) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            subscription = yield subscription_model_1.default.create({
                user_id: userId,
                company_id: req.user.company_object_id,
                plan: "free",
                status: "active",
                amount: 0,
                currency: "INR",
                current_period_start: now,
                current_period_end: periodEnd,
            });
        }
        res.status(200).json({ success: true, data: subscription });
    }
    catch (error) {
        console.error("getCurrentSubscription error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getCurrentSubscription = getCurrentSubscription;
/**
 * POST /subscription/create-order - Create Razorpay order for plan upgrade
 */
const createSubscriptionOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const { plan } = req.body;
        if (!plan || !subscription_interface_1.PLAN_CONFIG[plan]) {
            res.status(400).json({ success: false, message: "Invalid plan" });
            return;
        }
        const planConfig = subscription_interface_1.PLAN_CONFIG[plan];
        if (planConfig.price === 0) {
            res.status(400).json({ success: false, message: "Free plan doesn't require payment" });
            return;
        }
        const shortId = userId.toString().slice(-8);
        const receipt = `sub_${shortId}_${Date.now().toString(36)}`;
        const order = yield (0, razorpay_service_1.createRazorpayOrder)(planConfig.price, "INR", receipt, {
            user_id: userId.toString(),
            plan,
        });
        // Find or create subscription
        let subscription = yield subscription_model_1.default.findOne({
            user_id: userId,
            status: { $in: ["active", "past_due"] },
        });
        if (!subscription) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);
            subscription = yield subscription_model_1.default.create({
                user_id: userId,
                company_id: req.user.company_object_id,
                plan: "free",
                status: "active",
                amount: 0,
                currency: "INR",
                current_period_start: now,
                current_period_end: periodEnd,
            });
        }
        // Create payment record
        const payment = yield payment_model_1.default.create({
            user_id: userId,
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
    }
    catch (error) {
        console.error("createSubscriptionOrder error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.createSubscriptionOrder = createSubscriptionOrder;
/**
 * POST /subscription/verify-payment - Verify Razorpay payment and activate plan
 */
const verifyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            res.status(400).json({ success: false, message: "Missing payment details" });
            return;
        }
        // Verify signature
        const isValid = (0, razorpay_service_1.verifyRazorpaySignature)(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            // Update payment as failed
            yield payment_model_1.default.findOneAndUpdate({ razorpay_order_id }, {
                status: "failed",
                failure_reason: "Signature verification failed",
            });
            res.status(400).json({ success: false, message: "Payment verification failed" });
            return;
        }
        // Update payment record
        const payment = yield payment_model_1.default.findOneAndUpdate({ razorpay_order_id }, {
            razorpay_payment_id,
            razorpay_signature,
            status: "captured",
            paid_at: new Date(),
        }, { new: true });
        if (!payment) {
            res.status(404).json({ success: false, message: "Payment record not found" });
            return;
        }
        // Update subscription
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const subscription = yield subscription_model_1.default.findOneAndUpdate({ user_id: userId, status: { $in: ["active", "past_due"] } }, {
            plan: plan,
            status: "active",
            amount: subscription_interface_1.PLAN_CONFIG[plan].price,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            cancelled_at: null,
        }, { new: true });
        // Schedule auto-renewal via BullMQ
        if (subscription) {
            try {
                yield (0, subscription_worker_1.scheduleRenewal)(subscription._id.toString(), periodEnd);
            }
            catch (e) {
                console.warn("[Subscription] Could not schedule renewal - Redis may be unavailable");
            }
        }
        res.status(200).json({
            success: true,
            message: "Payment verified and subscription activated",
            data: subscription,
        });
    }
    catch (error) {
        console.error("verifyPayment error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.verifyPayment = verifyPayment;
/**
 * POST /subscription/cancel - Cancel subscription at period end
 */
const cancelSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const subscription = yield subscription_model_1.default.findOne({
            user_id: userId,
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
        // Mark for cancellation at period end
        subscription.cancel_at_period_end = true;
        yield subscription.save();
        // Schedule actual cancellation (downgrade to free)
        try {
            yield (0, subscription_worker_1.scheduleCancellation)(subscription._id.toString(), subscription.current_period_end);
        }
        catch (e) {
            console.warn("[Subscription] Could not schedule cancellation - Redis may be unavailable");
        }
        res.status(200).json({
            success: true,
            message: `Subscription will be cancelled at ${subscription.current_period_end.toISOString()}`,
            data: subscription,
        });
    }
    catch (error) {
        console.error("cancelSubscription error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.cancelSubscription = cancelSubscription;
/**
 * POST /subscription/downgrade-to-free - Immediately switch to free
 */
const downgradeToFree = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const subscription = yield subscription_model_1.default.findOneAndUpdate({ user_id: userId, status: { $in: ["active", "past_due"] } }, {
            plan: "free",
            status: "active",
            amount: 0,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            cancelled_at: new Date(),
        }, { new: true });
        res.status(200).json({
            success: true,
            message: "Downgraded to free plan",
            data: subscription,
        });
    }
    catch (error) {
        console.error("downgradeToFree error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.downgradeToFree = downgradeToFree;
/**
 * GET /subscription/payments - Get payment history
 */
const getPaymentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const payments = yield payment_model_1.default.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.status(200).json({ success: true, data: payments });
    }
    catch (error) {
        console.error("getPaymentHistory error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getPaymentHistory = getPaymentHistory;
/**
 * GET /subscription/plans - Get available plans
 */
const getPlans = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = Object.entries(subscription_interface_1.PLAN_CONFIG).map(([key, config]) => (Object.assign(Object.assign({ id: key }, config), { price_display: config.price === 0 ? "Free" : `₹${config.price / 100}/mo` })));
        res.status(200).json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getPlans = getPlans;
