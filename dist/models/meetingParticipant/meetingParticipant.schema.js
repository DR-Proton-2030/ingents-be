"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingParticipantSchema = void 0;
const mongoose_1 = require("mongoose");
const schemaOption_1 = require("../../constants/model/schemaOption");
const model_constant_1 = __importDefault(require("../../constants/model/model.constant"));
// Meeting Participant Schema (Junction table for many-to-many)
exports.meetingParticipantSchema = new mongoose_1.Schema({
    // Reference to the meeting
    meeting_object_id: model_constant_1.default.requiredObjectId,
    // Participant details (for internal users)
    user_object_id: model_constant_1.default.optionalNullObjectId,
    // For external guests (non-registered users)
    external_email: model_constant_1.default.optionalNullString,
    external_name: model_constant_1.default.optionalNullString,
    // Response & Status
    response_status: {
        type: String,
        enum: ["pending", "accepted", "declined", "tentative"],
        default: "pending",
    },
    is_optional: Object.assign(Object.assign({}, model_constant_1.default.optionalBoolean), { default: false }),
    responded_at: model_constant_1.default.optionalNullDate,
    // Notification tracking
    invitation_sent_at: model_constant_1.default.optionalNullDate,
    reminder_sent_at: model_constant_1.default.optionalNullDate,
    // Organization reference (for faster company-wide queries)
    company_object_id: model_constant_1.default.requiredObjectId,
}, Object.assign(Object.assign({}, schemaOption_1.GENERAL_SCHEMA_OPTIONS), { toJSON: { virtuals: true }, toObject: { virtuals: true } }));
// Virtual reference to user details
const UserVirtualReference = {
    ref: "users",
    localField: "user_object_id",
    foreignField: "_id",
    justOne: true,
};
exports.meetingParticipantSchema.virtual("user_details", UserVirtualReference);
// Virtual reference to meeting details
const MeetingVirtualReference = {
    ref: "scheduled_meetings",
    localField: "meeting_object_id",
    foreignField: "_id",
    justOne: true,
};
exports.meetingParticipantSchema.virtual("meeting_details", MeetingVirtualReference);
// Indexes for fast queries
// Primary use case: "Get all meetings for a user"
exports.meetingParticipantSchema.index({ user_object_id: 1, meeting_object_id: 1 });
// "Get all participants for a meeting"
exports.meetingParticipantSchema.index({ meeting_object_id: 1 });
// "Get pending invites for a user"
exports.meetingParticipantSchema.index({ user_object_id: 1, response_status: 1 });
// "Get all participants in a company"
exports.meetingParticipantSchema.index({ company_object_id: 1 });
// Compound index for external guests lookup
exports.meetingParticipantSchema.index({ external_email: 1, meeting_object_id: 1 });
