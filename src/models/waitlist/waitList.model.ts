import { model } from "mongoose";
import { IWaitlist } from "../../types/interface/waitlist.interface";
import waitListSchema from "./waitlist.schema";

const WaitListModel = model<IWaitlist>("waitlists", waitListSchema);

export default WaitListModel;