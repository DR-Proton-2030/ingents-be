import { Schema, VirtualTypeOptions } from "mongoose";
import { GENERAL_SCHEMA_OPTIONS } from "../../constants/model/schemaOption";
import SCHEMA_DEFINITION_PROPERTY from "../../constants/model/model.constant";
import { IScheduledMeeting } from "../../types/interface/scheduledMeeting.interface";
import { IUser } from "../../types/interface/user.interface";

// Recurrence Rule Sub-Schema
const recurrenceRuleSchema = new Schema(
    {
        frequency: {
            type: String,
            enum: ["daily", "weekly", "monthly"],
            required: true,
        },
        interval: {
            type: Number,
            default: 1, // e.g., every 1 week, every 2 weeks
        },
        days_of_week: {
            type: [Number], // 0-6 (Sunday-Saturday)
            default: [],
        },
        end_date: SCHEMA_DEFINITION_PROPERTY.optionalNullDate,
        occurrences: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
    },
    { _id: false } // No separate _id for subdocument
);

// Main Scheduled Meeting Schema
export const scheduledMeetingSchema: Schema<IScheduledMeeting> = new Schema<IScheduledMeeting>(
    {
        // Core Meeting Details
        title: SCHEMA_DEFINITION_PROPERTY.requiredString,
        description: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
        scheduled_start_time: SCHEMA_DEFINITION_PROPERTY.requiredDate,
        scheduled_end_time: SCHEMA_DEFINITION_PROPERTY.requiredDate,
        duration_minutes: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber,
        timezone: {
            type: String,
            default: "Asia/Kolkata",
        },

        // Host (single user who owns this meeting)
        host_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,

        // Meeting Configuration
        meeting_link: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
        meeting_code: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple null values
        },
        meeting_type: {
            type: String,
            enum: ["one_on_one", "team", "webinar", "interview", "other"],
            default: "team",
        },

        // Recurring Meeting
        is_recurring: {
            ...SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
            default: false,
        },
        recurrence_rule: {
            type: recurrenceRuleSchema,
            default: null,
        },
        parent_meeting_id: SCHEMA_DEFINITION_PROPERTY.optionalNullObjectId, // For recurring instances
        occurrence_index: SCHEMA_DEFINITION_PROPERTY.optionalNullNumber, // Which occurrence (1, 2, 3...)

        // Status & Reminders
        status: {
            type: String,
            enum: ["scheduled", "in_progress", "completed", "cancelled"],
            default: "scheduled",
        },
        reminder_minutes_before: {
            type: Number,
            default: 15, // Default 15 minutes before
        },
        is_reminder_sent: {
            ...SCHEMA_DEFINITION_PROPERTY.optionalBoolean,
            default: false,
        },

        // Organization & Audit
        company_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,
        created_by_user_object_id: SCHEMA_DEFINITION_PROPERTY.requiredObjectId,

        // Notes & Attachments
        notes: SCHEMA_DEFINITION_PROPERTY.optionalNullString,
        attachments: {
            type: [String],
            default: [],
        },
    },
    {
        ...GENERAL_SCHEMA_OPTIONS,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual reference to host user details
const HostUserVirtualReference: VirtualTypeOptions<IUser> = {
    ref: "users",
    localField: "host_user_object_id",
    foreignField: "_id",
    justOne: true,
};
scheduledMeetingSchema.virtual("host_details", HostUserVirtualReference);

// Virtual reference to parent meeting (for recurring instances)
const ParentMeetingVirtualReference: VirtualTypeOptions<IScheduledMeeting> = {
    ref: "scheduled_meetings",
    localField: "parent_meeting_id",
    foreignField: "_id",
    justOne: true,
};
scheduledMeetingSchema.virtual("parent_meeting", ParentMeetingVirtualReference);

// Indexes for better query performance
scheduledMeetingSchema.index({ host_user_object_id: 1, scheduled_start_time: 1 });
scheduledMeetingSchema.index({ company_object_id: 1, scheduled_start_time: 1 });
scheduledMeetingSchema.index({ parent_meeting_id: 1 }); // For fetching recurring instances
scheduledMeetingSchema.index({ status: 1, scheduled_start_time: 1 }); // For filtering by status
