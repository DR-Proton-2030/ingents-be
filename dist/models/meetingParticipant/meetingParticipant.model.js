"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const meetingParticipant_schema_1 = require("./meetingParticipant.schema");
const MeetingParticipantModel = (0, mongoose_1.model)("meeting_participants", meetingParticipant_schema_1.meetingParticipantSchema);
exports.default = MeetingParticipantModel;
