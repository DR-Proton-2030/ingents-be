"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const scheduledMeeting_schema_1 = require("./scheduledMeeting.schema");
const ScheduledMeetingModel = (0, mongoose_1.model)("scheduled_meetings", scheduledMeeting_schema_1.scheduledMeetingSchema);
exports.default = ScheduledMeetingModel;
