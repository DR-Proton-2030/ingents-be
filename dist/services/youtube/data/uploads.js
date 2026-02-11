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
exports.paginateUploads = void 0;
const paginateUploads = (youtube, uploadsPlaylistId, initialResponse) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const initialItems = [
        ...(((initialResponse === null || initialResponse === void 0 ? void 0 : initialResponse.data) || {}).items || []),
    ];
    const allItems = [...initialItems];
    if (!uploadsPlaylistId)
        return allItems;
    let nextPageToken = ((_a = initialResponse === null || initialResponse === void 0 ? void 0 : initialResponse.data) === null || _a === void 0 ? void 0 : _a.nextPageToken) || undefined;
    while (nextPageToken) {
        const resp = yield youtube.playlistItems.list({
            part: ["snippet", "contentDetails"],
            playlistId: uploadsPlaylistId,
            maxResults: 50,
            pageToken: nextPageToken,
        });
        allItems.push(...(resp.data.items || []));
        nextPageToken = ((_b = resp.data) === null || _b === void 0 ? void 0 : _b.nextPageToken) || undefined;
    }
    return allItems;
});
exports.paginateUploads = paginateUploads;
