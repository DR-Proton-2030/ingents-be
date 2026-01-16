import { Schema, VirtualTypeOptions } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IMeetingParticipant } from "../../types/interface/meetingParticipant.interface";
import { IUser } from "../../types/interface/user.interface";
import { IScheduledMeeting } from "../../types/interface/scheduledMeeting.interface";

// Meeting Participant Schema (Junction table for many-to-many)
export const meetingParticipantSchema: Schema<IMeetingParticipant> = new Schema<IMeetingParticipant>(
    {
        // Reference to the meeting
        meeting_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,

        // Participant details (for internal users)
        user_object_id: SCHEMA_DEFINITION_PROPERTY.optionalNullObjectId,

        // For external guests (non-registered users)
        external_email: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
        external_name: SCHEMA_DEFINITION_PROPERTY.optionalNullString,

        // Response & Status
        response_status: {
            type: String,
            enum: ["pending", "accepted", "declined", "tentative"],
            default: "pending",
        },
        is_optional: {
            ...SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
            default: false,
        },
        responded_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,

        // Notification tracking
        invitation_sent_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
        reminder_sent_at: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,

        // Organization reference (for faster company-wide queries)
        company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
    },
    {
        ...GENERAL_SCHEMA_OPTIONS,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual reference to user details
const UserVirtualReference: VirtualTypeOptions<IUser> = {
    ref: "users",
    localField: "user_object_id",
    foreignField: "_id",
    justOne: true,
};
meetingParticipantSchema.virtual("user_details", UserVirtualReference);

// Virtual reference to meeting details
const MeetingVirtualReference: VirtualTypeOptions<IScheduledMeeting> = {
    ref: "scheduled_meetings",
    localField: "meeting_object_id",
    foreignField: "_id",
    justOne: true,
};
meetingParticipantSchema.virtual("meeting_details", MeetingVirtualReference);

// Indexes for fast queries
// Primary use case: "Get all meetings for a user"
meetingParticipantSchema.index({ user_object_id: 1, meeting_object_id: 1 });

// "Get all participants for a meeting"
meetingParticipantSchema.index({ meeting_object_id: 1 });

// "Get pending invites for a user"
meetingParticipantSchema.index({ user_object_id: 1, response_status: 1 });

// "Get all participants in a company"
meetingParticipantSchema.index({ company_object_id: 1 });

// Compound index for external guests lookup
meetingParticipantSchema.index({ external_email: 1, meeting_object_id: 1 });
