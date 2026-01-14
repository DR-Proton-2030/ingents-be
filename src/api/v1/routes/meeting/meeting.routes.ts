import { Router } from "express";
import { 
    createMeeting, 
    getMeetings, 
    getMeetingById, 
    updateMeeting, 
    updateMeetingStatus,
    deleteMeeting, 
    addParticipants, 
    removeParticipant,
    respondToMeeting,
    getUpcomingMeetings
} from "../../controller/meeting/meeting.controller";
import { userAuth } from "../../middlewares/auth/userAuth";

const meetingRouter = Router();

// Meeting CRUD
meetingRouter.post("/create", userAuth, createMeeting);
meetingRouter.get("/", userAuth, getMeetings);
meetingRouter.get("/upcoming", userAuth, getUpcomingMeetings);
meetingRouter.get("/:meetingId", userAuth, getMeetingById);
meetingRouter.patch("/:meetingId", userAuth, updateMeeting);
meetingRouter.patch("/:meetingId/status", userAuth, updateMeetingStatus);
meetingRouter.delete("/:meetingId", userAuth, deleteMeeting);

// Participant management
meetingRouter.post("/:meetingId/participants", userAuth, addParticipants);
meetingRouter.delete("/:meetingId/participants/:participantId", userAuth, removeParticipant);

// Respond to meeting invitation (accept/decline/tentative)
meetingRouter.patch("/:meetingId/respond", userAuth, respondToMeeting);

export default meetingRouter;
