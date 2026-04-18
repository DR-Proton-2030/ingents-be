import { Router } from "express";
import {
  getCurrentSubscription,
  createSubscriptionOrder,
  verifyPayment,
  cancelSubscription,
  downgradeToFree,
  getPaymentHistory,
  getPlans,
} from "../../controller/subscription/subscription.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const subscriptionRouter = Router();

subscriptionRouter.get("/current", userAuth, getCurrentSubscription);
subscriptionRouter.get("/plans", getPlans);
subscriptionRouter.get("/payments", userAuth, getPaymentHistory);
subscriptionRouter.post("/create-order", userAuth, createSubscriptionOrder);
subscriptionRouter.post("/verify-payment", userAuth, verifyPayment);
subscriptionRouter.post("/cancel", userAuth, cancelSubscription);
subscriptionRouter.post("/downgrade", userAuth, downgradeToFree);

export default subscriptionRouter;
