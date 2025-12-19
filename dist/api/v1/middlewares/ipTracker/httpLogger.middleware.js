"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLoggerMiddleware = void 0;
// Paths to ignore from logging
const IGNORED_PATHS = ["/health", "/favicon.ico"];
const httpLoggerMiddleware = (req, res, next) => {
    // Skip logging for ignored paths
    if (IGNORED_PATHS.includes(req.path)) {
        return next();
    }
    const startTime = Date.now();
    // Log incoming request
    // logger.info({
    // 	type: "request",
    // 	method: req.method,
    // 	url: req.url,
    // 	ip: req.clientIp || "unknown",
    // 	userAgent: req.headers["user-agent"],
    // }, "Incoming request");
    // Capture response
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? "error" : "info";
        // logger[logLevel]({
        // 	type: "response",
        // 	method: req.method,
        // 	url: req.url,
        // 	statusCode: res.statusCode,
        // 	duration: `${duration}ms`,
        // 	ip: req.clientIp || "unknown",
        // }, `${req.method} ${req.url} - ${res.statusCode}`);
        return originalSend.call(this, data);
    };
    next();
};
exports.httpLoggerMiddleware = httpLoggerMiddleware;
exports.default = exports.httpLoggerMiddleware;
