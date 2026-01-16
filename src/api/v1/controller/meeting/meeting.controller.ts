import { Request, Response } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import ScheduledMeetingModel from "../../../../models/scheduledMeeting/scheduledMeeting.model";
import MeetingParticipantModel from "../../../../models/meetingParticipant/meetingParticipant.model";
import { IScheduledMeeting, MeetingStatus, MeetingType } from "../../../../types/interface/scheduledMeeting.interface";
import { ParticipantResponseStatus } from "../../../../types/interface/meetingParticipant.interface";

/**
 * Generate recurring meeting instances based on recurrence rule
 */
const generateRecurringInstances = (
    parentMeeting: any,
    recurrenceRule: any,
    maxInstances: number = 12 // Default: generate next 12 instances
) => {
    const instances: Partial<IScheduledMeeting>[] = [];
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
        if (endDateLimit && currentDate > endDateLimit) break;
        
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
export const createMeeting = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            title,
            description,
            scheduled_start_time,
            scheduled_end_time,
            duration_minutes,
            timezone = "Asia/Kolkata",
            meeting_type = "team",
            is_recurring = false,
            recurrence_rule,
            reminder_minutes_before = 15,
            notes,
            attachments = [],
            participants = [], // Array of { user_object_id?, external_email?, external_name?, is_optional? }
        } = req.body;

        const { _id: user_object_id, company_object_id } = req.user;

        // Generate unique meeting code
        const meeting_code = crypto.randomUUID().substring(0, 10).toUpperCase();
        const meeting_link = `https://ingents.ai/meeting/${meeting_code}`;

        // Create the main meeting
        const meetingPayload: Partial<IScheduledMeeting> = {
            title,
            description,
            scheduled_start_time: new Date(scheduled_start_time),
            scheduled_end_time: new Date(scheduled_end_time),
            duration_minutes,
            timezone,
            host_user_object_id: user_object_id,
            meeting_link,
            meeting_code,
            meeting_type: meeting_type as MeetingType,
            is_recurring,
            recurrence_rule: is_recurring ? recurrence_rule : null,
            status: "scheduled" as MeetingStatus,
            reminder_minutes_before,
            is_reminder_sent: false,
            company_object_id: company_object_id!,
            created_by_user_object_id: user_object_id,
            notes,
            attachments,
        };

        const newMeeting = await new ScheduledMeetingModel(meetingPayload).save({ session });

        // Create participant entries
        if (participants.length > 0) {
            const participantDocs = participants.map((p: any) => ({
                meeting_object_id: newMeeting._id,
                user_object_id: p.user_object_id || null,
                external_email: p.external_email || null,
                external_name: p.external_name || null,
                response_status: "pending" as ParticipantResponseStatus,
                is_optional: p.is_optional || false,
                company_object_id: company_object_id!,
            }));

            await MeetingParticipantModel.insertMany(participantDocs, { session });
        }

        // If recurring, generate instances
        let recurringInstances: any[] = [];
        if (is_recurring && recurrence_rule) {
            const instances = generateRecurringInstances(newMeeting, recurrence_rule);
            if (instances.length > 0) {
                recurringInstances = await ScheduledMeetingModel.insertMany(instances, { session });

                // Create participants for each instance
                for (const instance of recurringInstances) {
                    if (participants.length > 0) {
                        const instanceParticipants = participants.map((p: any) => ({
                            meeting_object_id: instance._id,
                            user_object_id: p.user_object_id || null,
                            external_email: p.external_email || null,
                            external_name: p.external_name || null,
                            response_status: "pending" as ParticipantResponseStatus,
                            is_optional: p.is_optional || false,
                            company_object_id: company_object_id!,
                        }));
                        await MeetingParticipantModel.insertMany(instanceParticipants, { session });
                    }
                }
            }
        }

        await session.commitTransaction();

        // Fetch created meeting with participants
        const createdMeeting = await ScheduledMeetingModel.findById(newMeeting._id)
            .populate("host_details", "full_name email")
            .lean();

        const meetingParticipants = await MeetingParticipantModel.find({ meeting_object_id: newMeeting._id })
            .populate("user_details", "full_name email")
            .lean();

        res.status(201).json({
            message: "Meeting created successfully",
            data: {
                meeting: createdMeeting,
                participants: meetingParticipants,
                recurring_instances_count: recurringInstances.length,
            },
        });
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Create Meeting Error:", error);
        res.status(500).json({ message: "Internal server error", error });
    } finally {
        session.endSession();
    }
};

/**
 * Get all meetings for the current user (as host or participant)
 * GET /api/v1/meetings
 */
export const getMeetings = async (req: Request, res: Response) => {
    try {
        const { _id: user_object_id, company_object_id } = req.user;
        const { page = 1, limit = 10, status, from_date, to_date } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        // Build query filters
        const meetingFilter: any = { company_object_id };
        
        if (status) {
            meetingFilter.status = status;
        }
        
        if (from_date || to_date) {
            meetingFilter.scheduled_start_time = {};
            if (from_date) meetingFilter.scheduled_start_time.$gte = new Date(from_date as string);
            if (to_date) meetingFilter.scheduled_start_time.$lte = new Date(to_date as string);
        }

        // First, get meetings where user is a participant
        const participantMeetings = await MeetingParticipantModel.find({ 
            user_object_id,
            company_object_id 
        }).select("meeting_object_id").lean();

        const participantMeetingIds = participantMeetings.map(p => p.meeting_object_id);

        // Get meetings where user is host OR participant
        meetingFilter.$or = [
            { host_user_object_id: user_object_id },
            { _id: { $in: participantMeetingIds } }
        ];

        const [meetings, total] = await Promise.all([
            ScheduledMeetingModel.find(meetingFilter)
                .populate("host_details", "full_name email")
                .sort({ scheduled_start_time: 1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            ScheduledMeetingModel.countDocuments(meetingFilter)
        ]);

        // Get participants for each meeting
        const meetingIds = meetings.map(m => m._id);
        const allParticipants = await MeetingParticipantModel.find({ 
            meeting_object_id: { $in: meetingIds } 
        })
            .populate("user_details", "full_name email")
            .lean();

        // Group participants by meeting
        const participantsByMeeting = allParticipants.reduce((acc: any, p: any) => {
            const key = p.meeting_object_id.toString();
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});

        const meetingsWithParticipants = meetings.map((m: any) => ({
            ...m,
            participants: participantsByMeeting[m._id.toString()] || [],
        }));

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
    } catch (error) {
        console.error("Get Meetings Error:", error);
        res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Get a single meeting by ID
 * GET /api/v1/meetings/:meetingId
 */
export const getMeetingById = async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { company_object_id } = req.user;

        const meeting = await ScheduledMeetingModel.findOne({
            _id: meetingId,
            company_object_id,
        })
            .populate("host_details", "full_name email")
            .populate("parent_meeting")
            .lean();

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const participants = await MeetingParticipantModel.find({ meeting_object_id: meetingId })
            .populate("user_details", "full_name email")
            .lean();

        // If this is a parent recurring meeting, get instances
        let instances: any[] = [];
        if (meeting.is_recurring) {
            instances = await ScheduledMeetingModel.find({ parent_meeting_id: meetingId })
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
    } catch (error) {
        console.error("Get Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};
export const getMeetingByCode = async (req: Request, res: Response) => {
    try {
        const { meetingCode } = req.params;
        const { company_object_id } = req.user;

        const meeting = await ScheduledMeetingModel.findOne({
            meeting_code: meetingCode,
            company_object_id,
        })
            .populate("host_details", "full_name email")
            .populate("parent_meeting")
            .lean();

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const participants = await MeetingParticipantModel.find({ meeting_object_id: meeting._id })
            .populate("user_details", "full_name email")
            .lean();

        // If this is a parent recurring meeting, get instances
        let instances: any[] = [];
        if (meeting.is_recurring) {
            instances = await ScheduledMeetingModel.find({ parent_meeting_id: meeting._id })
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
    } catch (error) {
        console.error("Get Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Update a meeting
 * PATCH /api/v1/meetings/:meetingId
 */
export const updateMeeting = async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { company_object_id } = req.user;
        const updates = req.body;

        // Don't allow updating certain fields
        delete updates._id;
        delete updates.company_object_id;
        delete updates.created_by_user_object_id;
        delete updates.meeting_code;

        const meeting = await ScheduledMeetingModel.findOneAndUpdate(
            { _id: meetingId, company_object_id },
            { $set: updates },
            { new: true }
        ).populate("host_details", "full_name email");

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        return res.status(200).json({
            message: "Meeting updated successfully",
            data: meeting,
        });
    } catch (error) {
        console.error("Update Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Update meeting status
 * PATCH /api/v1/meetings/:meetingId/status
 */
export const updateMeetingStatus = async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { status } = req.body;
        const { company_object_id } = req.user;

        const validStatuses: MeetingStatus[] = ["scheduled", "in_progress", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status",
                allowedStatuses: validStatuses,
            });
        }

        const meeting = await ScheduledMeetingModel.findOneAndUpdate(
            { _id: meetingId, company_object_id },
            { status },
            { new: true }
        );

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        return res.status(200).json({
            message: "Meeting status updated",
            data: meeting,
        });
    } catch (error) {
        console.error("Update Meeting Status Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Delete a meeting
 * DELETE /api/v1/meetings/:meetingId
 */
export const deleteMeeting = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { meetingId } = req.params;
        const { delete_instances = true } = req.query; // For recurring meetings
        const { company_object_id } = req.user;

        const meeting = await ScheduledMeetingModel.findOne({
            _id: meetingId,
            company_object_id,
        });

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        // Delete participants
        await MeetingParticipantModel.deleteMany({ meeting_object_id: meetingId }, { session });

        // If recurring parent, optionally delete instances
        if (meeting.is_recurring && delete_instances === "true") {
            const instances = await ScheduledMeetingModel.find({ parent_meeting_id: meetingId });
            const instanceIds = instances.map(i => i._id);
            
            // Delete instance participants
            await MeetingParticipantModel.deleteMany({ 
                meeting_object_id: { $in: instanceIds } 
            }, { session });
            
            // Delete instances
            await ScheduledMeetingModel.deleteMany({ parent_meeting_id: meetingId }, { session });
        }

        // Delete the main meeting
        await ScheduledMeetingModel.findByIdAndDelete(meetingId, { session });

        await session.commitTransaction();

        return res.status(200).json({
            message: "Meeting deleted successfully",
        });
    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Delete Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    } finally {
        session.endSession();
    }
};

/**
 * Add participants to a meeting
 * POST /api/v1/meetings/:meetingId/participants
 */
export const addParticipants = async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { participants } = req.body; // Array of { user_object_id?, external_email?, is_optional? }
        const { company_object_id } = req.user;

        const meeting = await ScheduledMeetingModel.findOne({
            _id: meetingId,
            company_object_id,
        });

        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        const participantDocs = participants.map((p: any) => ({
            meeting_object_id: meetingId,
            user_object_id: p.user_object_id || null,
            external_email: p.external_email || null,
            external_name: p.external_name || null,
            response_status: "pending" as ParticipantResponseStatus,
            is_optional: p.is_optional || false,
            company_object_id: company_object_id!,
        }));

        const newParticipants = await MeetingParticipantModel.insertMany(participantDocs);

        return res.status(201).json({
            message: "Participants added successfully",
            data: newParticipants,
        });
    } catch (error) {
        console.error("Add Participants Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Remove a participant from a meeting
 * DELETE /api/v1/meetings/:meetingId/participants/:participantId
 */
export const removeParticipant = async (req: Request, res: Response) => {
    try {
        const { meetingId, participantId } = req.params;
        const { company_object_id } = req.user;

        const result = await MeetingParticipantModel.findOneAndDelete({
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
    } catch (error) {
        console.error("Remove Participant Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Update participant response (accept/decline/tentative)
 * PATCH /api/v1/meetings/:meetingId/respond
 */
export const respondToMeeting = async (req: Request, res: Response) => {
    try {
        const { meetingId } = req.params;
        const { response_status } = req.body;
        const { _id: user_object_id } = req.user;

        const validStatuses: ParticipantResponseStatus[] = ["accepted", "declined", "tentative"];
        if (!validStatuses.includes(response_status)) {
            return res.status(400).json({
                message: "Invalid response status",
                allowedStatuses: validStatuses,
            });
        }

        const participant = await MeetingParticipantModel.findOneAndUpdate(
            { meeting_object_id: meetingId, user_object_id },
            { 
                response_status,
                responded_at: new Date(),
            },
            { new: true }
        );

        if (!participant) {
            return res.status(404).json({ message: "You are not a participant of this meeting" });
        }

        return res.status(200).json({
            message: "Response recorded successfully",
            data: participant,
        });
    } catch (error) {
        console.error("Respond to Meeting Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};

/**
 * Get upcoming meetings for dashboard
 * GET /api/v1/meetings/upcoming
 */
export const getUpcomingMeetings = async (req: Request, res: Response) => {
    try {
        const { _id: user_object_id, company_object_id } = req.user;
        const { limit = 5 } = req.query;

        const now = new Date();

        // Get meetings where user is a participant
        const participantMeetings = await MeetingParticipantModel.find({ 
            user_object_id,
            company_object_id 
        }).select("meeting_object_id").lean();

        const participantMeetingIds = participantMeetings.map(p => p.meeting_object_id);

        const meetings = await ScheduledMeetingModel.find({
            company_object_id,
            scheduled_start_time: { $gte: now },
            status: { $in: ["scheduled", "in_progress"] },
            $or: [
                { host_user_object_id: user_object_id },
                { _id: { $in: participantMeetingIds } }
            ]
        })
            .populate("host_details", "full_name email")
            .sort({ scheduled_start_time: 1 })
            .limit(Number(limit))
            .lean();

        return res.status(200).json({
            message: "Upcoming meetings fetched",
            data: meetings,
        });
    } catch (error) {
        console.error("Get Upcoming Meetings Error:", error);
        return res.status(500).json({ message: "Internal server error", error });
    }
};
