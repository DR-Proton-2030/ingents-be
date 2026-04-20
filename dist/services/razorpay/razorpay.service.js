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
exports.initiateRefund = exports.fetchPaymentDetails = exports.verifyRazorpaySignature = exports.createRazorpayOrder = exports.getRazorpayInstance = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_SYlbshsg5rKnuO";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "GEnd1u6iTgpA85oFstR9uf1J";
let razorpayInstance;
const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};
exports.getRazorpayInstance = getRazorpayInstance;
/**
 * Create a Razorpay order for subscription payment
 */
const createRazorpayOrder = (amount, // in paise
currency, receipt, notes) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = (0, exports.getRazorpayInstance)();
    const order = yield razorpay.orders.create({
        amount,
        currency,
        receipt,
        notes: notes || {},
    });
    return order;
});
exports.createRazorpayOrder = createRazorpayOrder;
/**
 * Verify Razorpay payment signature to prevent tampering
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const generatedSignature = crypto_1.default
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
    return generatedSignature === signature;
};
exports.verifyRazorpaySignature = verifyRazorpaySignature;
/**
 * Fetch payment details from Razorpay
 */
const fetchPaymentDetails = (paymentId) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = (0, exports.getRazorpayInstance)();
    return razorpay.payments.fetch(paymentId);
});
exports.fetchPaymentDetails = fetchPaymentDetails;
/**
 * Initiate a refund
 */
const initiateRefund = (paymentId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const razorpay = (0, exports.getRazorpayInstance)();
    const refundOptions = {};
    if (amount)
        refundOptions.amount = amount;
    return razorpay.payments.refund(paymentId, refundOptions);
});
exports.initiateRefund = initiateRefund;
