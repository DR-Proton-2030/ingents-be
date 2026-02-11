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
exports.fetchChannelInfo = void 0;
const fetchChannelInfo = (youtube) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const resp = yield youtube.channels.list({
        part: ["snippet", "statistics", "contentDetails", "brandingSettings"],
        mine: true,
    });
    if (!((_a = resp.data.items) === null || _a === void 0 ? void 0 : _a.length)) {
        throw new Error("No channel found");
    }
    const channelData = resp.data.items[0];
    const channelId = channelData.id;
    const uploadsPlaylistId = ((_c = (_b = channelData.contentDetails) === null || _b === void 0 ? void 0 : _b.relatedPlaylists) === null || _c === void 0 ? void 0 : _c.uploads) || null;
    return { channelData, channelId, uploadsPlaylistId };
});
exports.fetchChannelInfo = fetchChannelInfo;
