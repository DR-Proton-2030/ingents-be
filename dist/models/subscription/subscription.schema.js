"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const subscriptionSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "users", required: true },
    company_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "companies", required: true },
    plan: {
        type: String,
        enum: ["free", "pro", "pro_plus"],
        default: "free",
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "cancelled", "expired", "past_due"],
        default: "active",
        required: true,
    },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "INR" },
    razorpay_subscription_id: { type: String, default: null },
    razorpay_customer_id: { type: String, default: null },
    current_period_start: { type: Date, required: true, default: Date.now },
    current_period_end: { type: Date, required: true },
    cancel_at_period_end: { type: Boolean, default: false },
    cancelled_at: { type: Date, default: null },
    trial_end: { type: Date, default: null },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// One active subscription per user
subscriptionSchema.index({ user_id: 1, status: 1 });
exports.default = subscriptionSchema;
