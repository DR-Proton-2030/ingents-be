"use strict";
// Facebook does not expose traffic source breakdown comparable to YouTube.
// Return empty array and an explicit unavailability flag.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrafficSources = void 0;
function getTrafficSources() {
    return {
        sources: [],
        trafficSourcesUnavailable: true,
        reason: "Not available via Meta Graph API",
    };
}
exports.getTrafficSources = getTrafficSources;
