import { Types } from "mongoose";

export type SubscriptionPlan = "free" | "pro" | "pro_plus";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due";
export type PaymentStatus = "created" | "captured" | "failed" | "refunded";

export interface ISubscription {
  user_id: Types.ObjectId;
  company_id: Types.ObjectId;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number; // in paise (INR)
  currency: string;
  razorpay_subscription_id?: string;
  razorpay_customer_id?: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  cancelled_at?: Date;
  trial_end?: Date;
  metadata?: Record<string, any>;
}

export interface IPayment {
  user_id: Types.ObjectId;
  subscription_id: Types.ObjectId;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  plan: SubscriptionPlan;
  receipt: string;
  paid_at?: Date;
  failure_reason?: string;
}

export const PLAN_CONFIG: Record<SubscriptionPlan, { name: string; price: number; features: string[] }> = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "1 Project",
      "Basic Task Management",
      "Community Support",
      "5 Team Members",
    ],
  },
  pro: {
    name: "Pro",
    price: 200, // 2 rupees = 200 paise
    features: [
      "10 Projects",
      "Advanced Task Management",
      "Priority Support",
      "25 Team Members",
      "Social Media Integration",
      "Email Marketing",
    ],
  },
  pro_plus: {
    name: "Pro Plus",
    price: 500, // 5 rupees = 500 paise
    features: [
      "Unlimited Projects",
      "AI-Powered Analytics",
      "24/7 Premium Support",
      "Unlimited Team Members",
      "All Integrations",
      "Custom Branding",
      "API Access",
      "Advanced Reporting",
    ],
  },
};
