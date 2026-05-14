import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { IPayment } from "../../types/interface/subscription.interface";

const paymentSchema: Schema<IPayment> = new Schema<IPayment>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    company_id: { type: Schema.Types.ObjectId, ref: "companies", required: true },
    subscription_id: { type: Schema.Types.ObjectId, ref: "subscriptions", required: true },
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
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.index({ user_id: 1, status: 1 });
paymentSchema.index({ razorpay_order_id: 1 });

export default paymentSchema;
