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
exports.fetchMetaForVideos = exports.fetchVideoStatsMap = void 0;
const fetchVideoStatsMap = (youtube, videoIds) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const map = {};
    if (!(videoIds === null || videoIds === void 0 ? void 0 : videoIds.length))
        return map;
    const resp = yield youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: videoIds,
    });
    (_a = resp.data.items) === null || _a === void 0 ? void 0 : _a.forEach((v) => {
        if (v.id)
            map[v.id] = v;
    });
    return map;
});
exports.fetchVideoStatsMap = fetchVideoStatsMap;
const fetchMetaForVideos = (youtube, ids) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const map = {};
    if (!(ids === null || ids === void 0 ? void 0 : ids.length))
        return map;
    const resp = yield youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails", "status"],
        id: ids,
    });
    (_b = resp.data.items) === null || _b === void 0 ? void 0 : _b.forEach((v) => {
        if (v.id)
            map[v.id] = v;
    });
    return map;
});
exports.fetchMetaForVideos = fetchMetaForVideos;
