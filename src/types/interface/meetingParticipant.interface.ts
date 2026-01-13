import { SchemaDefinitionProperty, Types } from "mongoose";

// Participant response status enum
export type ParticipantResponseStatus = "pending" | "accepted" | "declined" | "tentative";

// Meeting Participant interface (separate collection for many-to-many relationship)
// This allows fast queries like: "Get all meetings for User X"
export interface IMeetingParticipant {
    // Reference to the meeting
    meeting_object_id: SchemaDefinitionProperty<Types.ObjectId>;

    // Participant details (for internal users)
    user_object_id?: SchemaDefinitionProperty<Types.ObjectId>;

    // For external guests (non-registered users)
    external_email?: string;
    external_name?: string;

    // Response & Status
    response_status: ParticipantResponseStatus;
    is_optional: boolean;
    responded_at?: Date;

    // Notification tracking
    invitation_sent_at?: Date;
    reminder_sent_at?: Date;

    // Organization reference (for faster company-wide queries)
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
}
