"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledMeetingSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
// Recurrence Rule Sub-Schema
const recurrenceRuleSchema = new mongoose_1.Schema({
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
    end_date: model_constant_1.default.optionalNullDate,
    occurrences: model_constant_1.default.optionalNullNumber,
}, { _id: false } // No separate _id for subdocument
);
// Main Scheduled Meeting Schema
exports.scheduledMeetingSchema = new mongoose_1.Schema({
    // Core Meeting Details
    title: model_constant_1.default.requiredString,
    description: model_constant_1.default.optionalNullString,
    scheduled_start_time: model_constant_1.default.requiredDate,
    scheduled_end_time: model_constant_1.default.requiredDate,
    duration_minutes: model_constant_1.default.optionalNullNumber,
    timezone: {
        type: String,
        default: "Asia/Kolkata",
    },
    // Host (single user who owns this meeting)
    host_user_object_id: model_constant_1.default.requiredObjectId,
    // Meeting Configuration
    meeting_link: model_constant_1.default.optionalNullString,
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
    is_recurring: Object.assign(Object.assign({}, model_constant_1.default.optionalBoolean), { default: false }),
    recurrence_rule: {
        type: recurrenceRuleSchema,
        default: null,
    },
    parent_meeting_id: model_constant_1.default.optionalNullObjectId, // For recurring instances
    occurrence_index: model_constant_1.default.optionalNullNumber, // Which occurrence (1, 2, 3...)
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
    is_reminder_sent: Object.assign(Object.assign({}, model_constant_1.default.optionalBoolean), { default: false }),
    // Organization & Audit
    company_object_id: model_constant_1.default.requiredObjectId,
    created_by_user_object_id: model_constant_1.default.requiredObjectId,
    // Notes & Attachments
    notes: model_constant_1.default.optionalNullString,
    attachments: {
        type: [String],
        default: [],
    },
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// Virtual reference to host user details
const HostUserVirtualReference = {
    ref: "users",
    localField: "host_user_object_id",
    foreignField: "_id",
    justOne: true,
};
exports.scheduledMeetingSchema.virtual("host_details", HostUserVirtualReference);
// Virtual reference to parent meeting (for recurring instances)
const ParentMeetingVirtualReference = {
    ref: "scheduled_meetings",
    localField: "parent_meeting_id",
    foreignField: "_id",
    justOne: true,
};
exports.scheduledMeetingSchema.virtual("parent_meeting", ParentMeetingVirtualReference);
// Indexes for better query performance
exports.scheduledMeetingSchema.index({ host_user_object_id: 1, scheduled_start_time: 1 });
exports.scheduledMeetingSchema.index({ company_object_id: 1, scheduled_start_time: 1 });
exports.scheduledMeetingSchema.index({ parent_meeting_id: 1 }); // For fetching recurring instances
exports.scheduledMeetingSchema.index({ status: 1, scheduled_start_time: 1 }); // For filtering by status
