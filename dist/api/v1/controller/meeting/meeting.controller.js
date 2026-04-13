"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingMeetings = exports.respondToMeeting = exports.removeParticipant = exports.addParticipants = exports.deleteMeeting = exports.updateMeetingStatus = exports.updateMeeting = exports.getMeetingByCode = exports.getMeetingById = exports.getMeetings = exports.createMeeting = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const scheduledMeeting_model_1 = __importDefault(require("../../../../models/scheduledMeeting/scheduledMeeting.model"));
const meetingParticipant_model_1 = __importDefault(require("../../../../models/meetingParticipant/meetingParticipant.model"));
const activityLog_service_1 = require("../../../../services/activityLog/activityLog.service");
/**
 * Generate recurring meeting instances based on recurrence rule
 */
const generateRecurringInstances = (parentMeeting, recurrenceRule, maxInstances = 12 // Default: generate next 12 instances
) => {
    const instances = [];
    const { frequency, interval, end_date, occurrences, days_of_week } = recurrenceRule;
    let currentDate = new Date(parentMeeting.scheduled_start_time);
    let endDate = new Date(parentMeeting.scheduled_end_time);
    const duration = endDate.getTime() - currentDate.getTime();
    const maxOccurrences = occurrences || maxInstances;
    const endDateLimit = end_date ? new Date(end_date) : null;
    for (let i = 1; i <= maxOccurrences; i++) {
        // Calculate next occurrence based on frequency
        switch (frequency) {
            case "daily":
                currentDate.setDate(currentDate.getDate() + interval);
                break;
            case "weekly":
                currentDate.setDate(currentDate.getDate() + (7 * interval));
                break;
            case "monthly":
                currentDate.setMonth(currentDate.getMonth() + interval);
                break;
        }
        // Check if we've passed the end date
        if (endDateLimit && currentDate > endDateLimit)
            break;
        const instanceEndTime = new Date(currentDate.getTime() + duration);
        instances.push({
            title: parentMeeting.title,
            description: parentMeeting.description,
            scheduled_start_time: new Date(currentDate),
            scheduled_end_time: instanceEndTime,
            duration_minutes: parentMeeting.duration_minutes,
            timezone: parentMeeting.timezone,
            host_user_object_id: parentMeeting.host_user_object_id,
            meeting_link: parentMeeting.meeting_link,
            meeting_code: `${parentMeeting.meeting_code}-${i}`,
            meeting_type: parentMeeting.meeting_type,
            is_recurring: false, // Instances are not recurring themselves
            parent_meeting_id: parentMeeting._id,
            occurrence_index: i,
            status: "scheduled",
            reminder_minutes_before: parentMeeting.reminder_minutes_before,
            is_reminder_sent: false,
            company_object_id: parentMeeting.company_object_id,
            created_by_user_object_id: parentMeeting.created_by_user_object_id,
        });
    }
    return instances;
};
/**
 * Create a new scheduled meeting
 * POST /api/v1/meetings/create
 */
const createMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { title, description, scheduled_start_time, scheduled_end_time, duration_minutes, timezone = "Asia/Kolkata", meeting_type = "team", is_recurring = false, recurrence_rule, reminder_minutes_before = 15, notes, attachments = [], participants = [], // Array of { user_object_id?, external_email?, external_name?, is_optional? }
         } = req.body;
        const { _id: user_object_id, company_object_id } = req.user;
        // Generate unique meeting code
        const meeting_code = crypto_1.default.randomUUID().substring(0, 10).toUpperCase();
        const meeting_link = `https://ingents.ai/meeting/${meeting_code}`;
        // Create the main meeting
        const meetingPayload = {
            title,
            description,
            scheduled_start_time: new Date(scheduled_start_time),
            scheduled_end_time: new Date(scheduled_end_time),
            duration_minutes,
            timezone,
            host_user_object_id: user_object_id,
            meeting_link,
            meeting_code,
            meeting_type: meeting_type,
            is_recurring,
            recurrence_rule: is_recurring ? recurrence_rule : null,
            status: "scheduled",
            reminder_minutes_before,
            is_reminder_sent: false,
            company_object_id: company_object_id,
            created_by_user_object_id: user_object_id,
            notes,
            attachments,
        };
        const newMeeting = yield new scheduledMeeting_model_1.default(meetingPayload).save({ session });
        // Create participant entries
        if (participants.length > 0) {
            const participantDocs = participants.map((p) => ({
                meeting_object_id: newMeeting._id,
                user_object_id: p.user_object_id || null,
                external_email: p.external_email || null,
                external_name: p.external_name || null,
                response_status: "pending",
                is_optional: p.is_optional || false,
                company_object_id: company_object_id,
            }));
            yield meetingParticipant_model_1.default.insertMany(participantDocs, { session });
        }
        // If recurring, generate instances
        let recurringInstances = [];
        if (is_recurring && recurrence_rule) {
            const instances = generateRecurringInstances(newMeeting, recurrence_rule);
            if (instances.length > 0) {
                recurringInstances = yield scheduledMeeting_model_1.default.insertMany(instances, { session });
                // Create participants for each instance
                for (const instance of recurringInstances) {
                    if (participants.length > 0) {
                        const instanceParticipants = participants.map((p) => ({
                            meeting_object_id: instance._id,
                            user_object_id: p.user_object_id || null,
                            external_email: p.external_email || null,
                            external_name: p.external_name || null,
                            response_status: "pending",
                            is_optional: p.is_optional || false,
                            company_object_id: company_object_id,
                        }));
                        yield meetingParticipant_model_1.default.insertMany(instanceParticipants, { session });
                    }
                }
            }
        }
        yield session.commitTransaction();
        // Fetch created meeting with participants
        const createdMeeting = yield scheduledMeeting_model_1.default.findById(newMeeting._id)
            .populate("host_details", "full_name email")
            .lean();
        const meetingParticipants = yield meetingParticipant_model_1.default.find({ meeting_object_id: newMeeting._id })
            .populate("user_details", "full_name email")
            .lean();
        (0, activityLog_service_1.logActivity)({
            company_object_id: company_object_id === null || company_object_id === void 0 ? void 0 : company_object_id.toString(),
            actor_object_id: user_object_id === null || user_object_id === void 0 ? void 0 : user_object_id.toString(),
            actor_name: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.full_name) || "Unknown",
            activity_type: "MEETING_CREATED",
            message: `created a meeting "${title}"`,
            metadata: { meeting_id: newMeeting._id },
        });
        res.status(201).json({
            message: "Meeting created successfully",
            data: {
                meeting: createdMeeting,
                participants: meetingParticipants,
                recurring_instances_count: recurringInstances.length,
            },
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Create Meeting Error:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
    finally {
        session.endSession();
    }
});
exports.createMeeting = createMeeting;
/**
 * Get all meetings for the current user (as host or participant)
 * GET /api/v1/meetings
 */
const getMeetings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id: user_object_id, company_object_id } = req.user;
        const { page = 1, limit = 10, status, from_date, to_date } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build query filters
        const meetingFilter = { company_object_id };
        if (status) {
            meetingFilter.status = status;
        }
        if (from_date || to_date) {
            meetingFilter.scheduled_start_time = {};
            if (from_date)
                meetingFilter.scheduled_start_time.$gte = new Date(from_date);
            if (to_date)
                meetingFilter.scheduled_start_time.$lte = new Date(to_date);
        }
        // First, get meetings where user is a participant
        const participantMeetings = yield meetingParticipant_model_1.default.find({
            user_object_id,
            company_object_id
        }).select("meeting_object_id").lean();
        const participantMeetingIds = participantMeetings.map(p => p.meeting_object_id);
        // Get meetings where user is host OR participant
        meetingFilter.$or = [
            { host_user_object_id: user_object_id },
            { _id: { $in: participantMeetingIds } }
        ];
        const [meetings, total] = yield Promise.all([
            scheduledMeeting_model_1.default.find(meetingFilter)
                .populate("host_details", "full_name email profile_picture")
                .sort({ scheduled_start_time: 1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            scheduledMeeting_model_1.default.countDocuments(meetingFilter)
        ]);
        // Get participants for each meeting
        const meetingIds = meetings.map(m => m._id);
        const allParticipants = yield meetingParticipant_model_1.default.find({
            meeting_object_id: { $in: meetingIds }
        })
            .populate("user_details", "full_name email profile_picture")
            .lean();
        // Group participants by meeting
        const participantsByMeeting = allParticipants.reduce((acc, p) => {
            const key = p.meeting_object_id.toString();
            if (!acc[key])
                acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});
        const meetingsWithParticipants = meetings.map((m) => (Object.assign(Object.assign({}, m), { participants: participantsByMeeting[m._id.toString()] || [] })));
        res.status(200).json({
            message: "Meetings fetched successfully",
            data: meetingsWithParticipants,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get Meetings Error:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getMeetings = getMeetings;
/**
 * Get a single meeting by ID
 * GET /api/v1/meetings/:meetingId
 */
const getMeetingById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId } = req.params;
        const { company_object_id } = req.user;
        const meeting = yield scheduledMeeting_model_1.default.findOne({
            _id: meetingId,
            company_object_id,
        })
            .populate("host_details", "full_name email profile_picture")
            .populate("parent_meeting")
            .lean();
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        const participants = yield meetingParticipant_model_1.default.find({ meeting_object_id: meetingId })
            .populate("user_details", "full_name email profile_picture")
            .lean();
        // If this is a parent recurring meeting, get instances
        let instances = [];
        if (meeting.is_recurring) {
            instances = yield scheduledMeeting_model_1.default.find({ parent_meeting_id: meetingId })
                .sort({ scheduled_start_time: 1 })
                .lean();
        }
        return res.status(200).json({
            message: "Meeting fetched successfully",
            data: {
                meeting,
                participants,
                instances,
            },
        });
    }
    catch (error) {
        console.error("Get Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getMeetingById = getMeetingById;
const getMeetingByCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingCode } = req.params;
        const { company_object_id } = req.user;
        const meeting = yield scheduledMeeting_model_1.default.findOne({
            meeting_code: meetingCode,
            company_object_id,
        })
            .populate("host_details", "full_name email")
            .populate("parent_meeting")
            .lean();
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        const participants = yield meetingParticipant_model_1.default.find({ meeting_object_id: meeting._id })
            .populate("user_details", "full_name email")
            .lean();
        // If this is a parent recurring meeting, get instances
        let instances = [];
        if (meeting.is_recurring) {
            instances = yield scheduledMeeting_model_1.default.find({ parent_meeting_id: meeting._id })
                .sort({ scheduled_start_time: 1 })
                .lean();
        }
        return res.status(200).json({
            message: "Meeting fetched successfully",
            data: {
                meeting,
                participants,
                instances,
            },
        });
    }
    catch (error) {
        console.error("Get Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getMeetingByCode = getMeetingByCode;
/**
 * Update a meeting
 * PATCH /api/v1/meetings/:meetingId
 */
const updateMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId } = req.params;
        const { company_object_id } = req.user;
        const updates = req.body;
        // Don't allow updating certain fields
        delete updates._id;
        delete updates.company_object_id;
        delete updates.created_by_user_object_id;
        delete updates.meeting_code;
        const meeting = yield scheduledMeeting_model_1.default.findOneAndUpdate({ _id: meetingId, company_object_id }, { $set: updates }, { new: true }).populate("host_details", "full_name email");
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        return res.status(200).json({
            message: "Meeting updated successfully",
            data: meeting,
        });
    }
    catch (error) {
        console.error("Update Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.updateMeeting = updateMeeting;
/**
 * Update meeting status
 * PATCH /api/v1/meetings/:meetingId/status
 */
const updateMeetingStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId } = req.params;
        const { status } = req.body;
        const { company_object_id } = req.user;
        const validStatuses = ["scheduled", "in_progress", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status",
                allowedStatuses: validStatuses,
            });
        }
        const meeting = yield scheduledMeeting_model_1.default.findOneAndUpdate({ _id: meetingId, company_object_id }, { status }, { new: true });
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        return res.status(200).json({
            message: "Meeting status updated",
            data: meeting,
        });
    }
    catch (error) {
        console.error("Update Meeting Status Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.updateMeetingStatus = updateMeetingStatus;
/**
 * Delete a meeting
 * DELETE /api/v1/meetings/:meetingId
 */
const deleteMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { meetingId } = req.params;
        const { delete_instances = true } = req.query; // For recurring meetings
        const { company_object_id } = req.user;
        const meeting = yield scheduledMeeting_model_1.default.findOne({
            _id: meetingId,
            company_object_id,
        });
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        // Delete participants
        yield meetingParticipant_model_1.default.deleteMany({ meeting_object_id: meetingId }, { session });
        // If recurring parent, optionally delete instances
        if (meeting.is_recurring && delete_instances === "true") {
            const instances = yield scheduledMeeting_model_1.default.find({ parent_meeting_id: meetingId });
            const instanceIds = instances.map(i => i._id);
            // Delete instance participants
            yield meetingParticipant_model_1.default.deleteMany({
                meeting_object_id: { $in: instanceIds }
            }, { session });
            // Delete instances
            yield scheduledMeeting_model_1.default.deleteMany({ parent_meeting_id: meetingId }, { session });
        }
        // Delete the main meeting
        yield scheduledMeeting_model_1.default.findByIdAndDelete(meetingId, { session });
        yield session.commitTransaction();
        return res.status(200).json({
            message: "Meeting deleted successfully",
        });
    }
    catch (error) {
        if (session.inTransaction())
            yield session.abortTransaction();
        console.error("Delete Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
    finally {
        session.endSession();
    }
});
exports.deleteMeeting = deleteMeeting;
/**
 * Add participants to a meeting
 * POST /api/v1/meetings/:meetingId/participants
 */
const addParticipants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId } = req.params;
        const { participants } = req.body; // Array of { user_object_id?, external_email?, is_optional? }
        const { company_object_id } = req.user;
        const meeting = yield scheduledMeeting_model_1.default.findOne({
            _id: meetingId,
            company_object_id,
        });
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }
        const participantDocs = participants.map((p) => ({
            meeting_object_id: meetingId,
            user_object_id: p.user_object_id || null,
            external_email: p.external_email || null,
            external_name: p.external_name || null,
            response_status: "pending",
            is_optional: p.is_optional || false,
            company_object_id: company_object_id,
        }));
        const newParticipants = yield meetingParticipant_model_1.default.insertMany(participantDocs);
        return res.status(201).json({
            message: "Participants added successfully",
            data: newParticipants,
        });
    }
    catch (error) {
        console.error("Add Participants Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.addParticipants = addParticipants;
/**
 * Remove a participant from a meeting
 * DELETE /api/v1/meetings/:meetingId/participants/:participantId
 */
const removeParticipant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId, participantId } = req.params;
        const { company_object_id } = req.user;
        const result = yield meetingParticipant_model_1.default.findOneAndDelete({
            _id: participantId,
            meeting_object_id: meetingId,
            company_object_id,
        });
        if (!result) {
            return res.status(404).json({ message: "Participant not found" });
        }
        return res.status(200).json({
            message: "Participant removed successfully",
        });
    }
    catch (error) {
        console.error("Remove Participant Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.removeParticipant = removeParticipant;
/**
 * Update participant response (accept/decline/tentative)
 * PATCH /api/v1/meetings/:meetingId/respond
 */
const respondToMeeting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { meetingId } = req.params;
        const { response_status } = req.body;
        const { _id: user_object_id } = req.user;
        const validStatuses = ["accepted", "declined", "tentative"];
        if (!validStatuses.includes(response_status)) {
            return res.status(400).json({
                message: "Invalid response status",
                allowedStatuses: validStatuses,
            });
        }
        const participant = yield meetingParticipant_model_1.default.findOneAndUpdate({ meeting_object_id: meetingId, user_object_id }, {
            response_status,
            responded_at: new Date(),
        }, { new: true });
        if (!participant) {
            return res.status(404).json({ message: "You are not a participant of this meeting" });
        }
        return res.status(200).json({
            message: "Response recorded successfully",
            data: participant,
        });
    }
    catch (error) {
        console.error("Respond to Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.respondToMeeting = respondToMeeting;
/**
 * Get upcoming meetings for dashboard
 * GET /api/v1/meetings/upcoming
 */
const getUpcomingMeetings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id: user_object_id, company_object_id } = req.user;
        const { limit = 1 } = req.query;
        const now = new Date();
        // Get meetings where user is a participant
        const participantMeetings = yield meetingParticipant_model_1.default.find({
            user_object_id,
            company_object_id
        }).select("meeting_object_id").lean();
        const participantMeetingIds = participantMeetings.map(p => p.meeting_object_id);
        const meetings = yield scheduledMeeting_model_1.default.find({
            company_object_id,
            scheduled_start_time: { $gte: now },
            status: { $in: ["scheduled", "in_progress"] },
            $or: [
                { host_user_object_id: user_object_id },
                { _id: { $in: participantMeetingIds } }
            ]
        })
            .populate("host_details", "full_name email profile_picture")
            .sort({ scheduled_start_time: 1 })
            .limit(Number(limit))
            .lean();
        // Get participants for each meeting
        const meetingIds = meetings.map((m) => m._id);
        const allParticipants = yield meetingParticipant_model_1.default.find({
            meeting_object_id: { $in: meetingIds }
        })
            .populate("user_details", "full_name email profile_picture")
            .lean();
        // Group participants by meeting
        const participantsByMeeting = allParticipants.reduce((acc, p) => {
            const key = p.meeting_object_id.toString();
            if (!acc[key])
                acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});
        const meetingsWithParticipants = meetings.map((m) => (Object.assign(Object.assign({}, m), { participants: participantsByMeeting[m._id.toString()] || [] })));
        return res.status(200).json({
            message: "Upcoming meetings fetched",
            data: meetingsWithParticipants,
        });
    }
    catch (error) {
        console.error("Get Upcoming Meetings Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
});
exports.getUpcomingMeetings = getUpcomingMeetings;
