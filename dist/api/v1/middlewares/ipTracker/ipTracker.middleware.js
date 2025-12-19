"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipTrackerMiddleware = void 0;
const getClientIp = (req) => {
    var _a;
    // 1. Check X-Forwarded-For header (AWS ALB, proxies, load balancers)
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        const ips = typeof forwardedFor === "string" ? forwardedFor.split(",") : forwardedFor;
        return ips[0].trim();
    }
    const realIp = req.headers["x-real-ip"];
    if (realIp) {
        return typeof realIp === "string" ? realIp : realIp[0];
    }
    return (req.socket.remoteAddress ||
        ((_a = req.connection) === null || _a === void 0 ? void 0 : _a.remoteAddress) ||
        "unknown");
};
/**
 * IP Tracker Middleware
 * Attaches client IP address to the request object
 */
const ipTrackerMiddleware = (req, res, next) => {
    req.clientIp = getClientIp(req);
    next();
};
exports.ipTrackerMiddleware = ipTrackerMiddleware;
exports.default = exports.ipTrackerMiddleware;
