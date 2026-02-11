"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoToSeconds = void 0;
// ISO 8601 duration (PTnHnMnS) to seconds
const isoToSeconds = (iso) => {
    if (!iso || typeof iso !== "string")
        return 0;
    const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!m)
        return 0;
    const h = Number(m[1] || 0);
    const min = Number(m[2] || 0);
    const s = Number(m[3] || 0);
    return h * 3600 + min * 60 + s;
};
exports.isoToSeconds = isoToSeconds;
