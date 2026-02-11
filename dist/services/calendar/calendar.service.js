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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarEvents = void 0;
const googleapis_1 = require("googleapis");
const GoogleAuth_1 = require("../googleAuth/GoogleAuth");
const getCalendarEvents = (user_object_id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authClient = yield (0, GoogleAuth_1.getAuthorizedGoogleClient)(user_object_id);
        const calendar = googleapis_1.google.calendar({
            version: "v3",
            auth: authClient,
        });
        const events = yield calendar.events.list({
            calendarId: "primary",
            maxResults: 100,
        });
    }
    catch (error) { }
});
exports.getCalendarEvents = getCalendarEvents;
