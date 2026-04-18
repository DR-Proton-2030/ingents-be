import { model } from "mongoose";
import subscriptionSchema from "./subscription.schema";
import { ISubscription } from "../../types/interface/subscription.interface";

const SubscriptionModel = model<ISubscription>("subscriptions", subscriptionSchema);

export default SubscriptionModel;
