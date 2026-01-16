import { SchemaDefinitionProperty, Types } from "mongoose";

export type MeetingType = "one_on_one" | "team" | "webinar" | "interview" | "other";

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface IRecurrenceRule {
    frequency: RecurrenceFrequency;
    interval: number;           
    days_of_week?: number[];   
    end_date?: Date;            
    occurrences?: number;       
}
export interface IScheduledMeeting {
    title: string;
    description?: string;
    scheduled_start_time: Date;
    scheduled_end_time: Date;
    duration_minutes?: number;
    timezone?: string;
    host_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    meeting_link?: string;
    meeting_code?: string;
    meeting_type: MeetingType;
    
    is_recurring: boolean;
    recurrence_rule?: IRecurrenceRule;
    parent_meeting_id?: SchemaDefinitionProperty<Types.ObjectId>; 
    occurrence_index?: number; 

    status: MeetingStatus;
    reminder_minutes_before: number;
    is_reminder_sent: boolean;

    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    created_by_user_object_id: SchemaDefinitionProperty<Types.ObjectId>;

    notes?: string;
    attachments?: string[];
}
