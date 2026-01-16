"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const meeting_controller_1 = require("../../controller/meeting/meeting.controller");
const userAuth_1 = require("../../middlewares/auth/userAuth");
const meetingRouter = (0, express_1.Router)();
// Meeting CRUD
meetingRouter.post("/create", userAuth_1.userAuth, meeting_controller_1.createMeeting);
meetingRouter.get("/", userAuth_1.userAuth, meeting_controller_1.getMeetings);
meetingRouter.get("/upcoming", userAuth_1.userAuth, meeting_controller_1.getUpcomingMeetings);
meetingRouter.get("/:meetingId", userAuth_1.userAuth, meeting_controller_1.getMeetingById);
meetingRouter.get("/code/:meetingCode", userAuth_1.userAuth, meeting_controller_1.getMeetingByCode);
meetingRouter.patch("/:meetingId", userAuth_1.userAuth, meeting_controller_1.updateMeeting);
meetingRouter.patch("/:meetingId/status", userAuth_1.userAuth, meeting_controller_1.updateMeetingStatus);
meetingRouter.delete("/:meetingId", userAuth_1.userAuth, meeting_controller_1.deleteMeeting);
// Participant management
meetingRouter.post("/:meetingId/participants", userAuth_1.userAuth, meeting_controller_1.addParticipants);
meetingRouter.delete("/:meetingId/participants/:participantId", userAuth_1.userAuth, meeting_controller_1.removeParticipant);
// Respond to meeting invitation (accept/decline/tentative)
meetingRouter.patch("/:meetingId/respond", userAuth_1.userAuth, meeting_controller_1.respondToMeeting);
exports.default = meetingRouter;
