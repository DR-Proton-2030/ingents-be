import { model } from "mongoose";
import { meetingParticipantSchema } from "./meetingParticipant.schema";
import { IMeetingParticipant } from "../../types/interface/meetingParticipant.interface";

const MeetingParticipantModel = model<IMeetingParticipant>("meeting_participants", meetingParticipantSchema);

export default MeetingParticipantModel;
