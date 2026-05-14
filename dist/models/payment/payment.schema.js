"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const paymentSchema = new mongoose_1.Schema({
    user_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "users", required: true },
    company_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "companies", required: true },
    subscription_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "subscriptions", required: true },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, default: null },
    razorpay_signature: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
        type: String,
        enum: ["created", "captured", "failed", "refunded"],
        default: "created",
        required: true,
    },
    plan: {
        type: String,
        enum: ["free", "pro", "pro_plus"],
        required: true,
    },
    receipt: { type: String, required: true },
    paid_at: { type: Date, default: null },
    failure_reason: { type: String, default: null },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
paymentSchema.index({ user_id: 1, status: 1 });
paymentSchema.index({ razorpay_order_id: 1 });
exports.default = paymentSchema;
