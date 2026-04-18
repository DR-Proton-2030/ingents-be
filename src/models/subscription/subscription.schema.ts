import { Schema } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import { ISubscription } from "../../types/interface/subscription.interface";

const subscriptionSchema: Schema<ISubscription> = new Schema<ISubscription>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
    company_id: { type: Schema.Types.ObjectId, ref: "companies", required: true },
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
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    ...GENERAL_SCHEMA_OPTIONS,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One active subscription per user
subscriptionSchema.index({ user_id: 1, status: 1 });

export default subscriptionSchema;
