import { SchemaDefinitionProperty, Types } from "mongoose";

// Meeting type enum
export type MeetingType = "one_on_one" | "team" | "webinar" | "interview" | "other";

// Meeting status enum
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

// Recurrence frequency enum
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

// Recurrence rule interface (for recurring meetings)
export interface IRecurrenceRule {
    frequency: RecurrenceFrequency;
    interval: number;           // e.g., every 2 weeks
    days_of_week?: number[];    // 0-6 (Sunday-Saturday)
    end_date?: Date;            // When recurrence ends
    occurrences?: number;       // Number of occurrences
}

// Main Scheduled Meeting interface
// Note: Participants are stored in a separate MeetingParticipant collection for better query performance
export interface IScheduledMeeting {
    // Core Meeting Details
    title: string;
    description?: string;
    scheduled_start_time: Date;
    scheduled_end_time: Date;
    duration_minutes?: number;
    timezone?: string;

    // Host (single user who owns this meeting)
    host_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;

    // Meeting Configuration
    meeting_link?: string;
    meeting_code?: string;
    meeting_type: MeetingType;
    
    // Recurring Meeting
    is_recurring: boolean;
    recurrence_rule?: IRecurrenceRule;
    parent_meeting_id?: SchemaDefinitionProperty<Types.ObjectId>; // For recurring instances
    occurrence_index?: number; // Which occurrence in the series (1, 2, 3...)

    // Status & Reminders
    status: MeetingStatus;
    reminder_minutes_before: number;
    is_reminder_sent: boolean;

    // Organization & Audit
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;

    // Notes & Attachments (optional)
    notes?: string;
    attachments?: string[]; // Array of file URLs
}
