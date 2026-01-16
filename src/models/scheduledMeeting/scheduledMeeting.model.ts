import { model } from "mongoose";
import { scheduledMeetingSchema } from "./scheduledMeeting.schema";
import { IScheduledMeeting } from "../../types/interface/scheduledMeeting.interface";

const ScheduledMeetingModel = model<IScheduledMeeting>("scheduled_meetings", scheduledMeetingSchema);

export default ScheduledMeetingModel;
