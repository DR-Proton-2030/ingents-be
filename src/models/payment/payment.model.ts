import { model } from "mongoose";
import paymentSchema from "./payment.schema";
import { IPayment } from "../../types/interface/subscription.interface";

const PaymentModel = model<IPayment>("payments", paymentSchema);

export default PaymentModel;
