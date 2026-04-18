import Razorpay from "razorpay";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_SYlbshsg5rKnuO";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "GEnd1u6iTgpA85oFstR9uf1J";

let razorpayInstance: Razorpay;

export const getRazorpayInstance = (): Razorpay => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

/**
 * Create a Razorpay order for subscription payment
 */
export const createRazorpayOrder = async (
  amount: number, // in paise
  currency: string,
  receipt: string,
  notes?: Record<string, string>
) => {
  const razorpay = getRazorpayInstance();
  const order = await razorpay.orders.create({
    amount,
    currency,
    receipt,
    notes: notes || {},
  });
  return order;
};

/**
 * Verify Razorpay payment signature to prevent tampering
 */
export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
};

/**
 * Fetch payment details from Razorpay
 */
export const fetchPaymentDetails = async (paymentId: string) => {
  const razorpay = getRazorpayInstance();
  return razorpay.payments.fetch(paymentId);
};

/**
 * Initiate a refund
 */
export const initiateRefund = async (paymentId: string, amount?: number) => {
  const razorpay = getRazorpayInstance();
  const refundOptions: any = {};
  if (amount) refundOptions.amount = amount;
  return razorpay.payments.refund(paymentId, refundOptions);
};
