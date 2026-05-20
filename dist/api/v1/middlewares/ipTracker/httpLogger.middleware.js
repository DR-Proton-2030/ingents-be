"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLoggerMiddleware = void 0;
const logger_1 = require("../../../../utils/logger");
// Paths to ignore from logging
const IGNORED_PATHS = ["/health", "/favicon.ico"];
const methodColors = {
    GET: "\x1b[36m", // Cyan
    POST: "\x1b[32m", // Green
    PUT: "\x1b[33m", // Yellow
    PATCH: "\x1b[38;5;208m", // Orange
    DELETE: "\x1b[31m", // Red
};
const httpLoggerMiddleware = (req, res, next) => {
    // Skip logging for ignored paths
    if (IGNORED_PATHS.includes(req.path)) {
        return next();
    }
    const startTime = Date.now();
    // Capture response finish event to log details
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const statusCode = res.statusCode;
        // Colorize method
        const methodColor = methodColors[method] || "\x1b[37m";
        const formattedMethod = `${methodColor}${logger_1.styles.bold}${method}${logger_1.styles.reset}`;
        // Colorize status code
        let statusColor = "\x1b[32m"; // Success default (Green)
        if (statusCode >= 500) {
            statusColor = "\x1b[1;31m"; // Server Error (Red bold)
        }
        else if (statusCode >= 400) {
            statusColor = "\x1b[1;33m"; // Client Error (Yellow/Orange bold)
        }
        else if (statusCode >= 300) {
            statusColor = "\x1b[36m"; // Redirect (Cyan)
        }
        const formattedStatus = `${statusColor}${statusCode}${logger_1.styles.reset}`;
        // Colorize duration
        let durationColor = "\x1b[32m"; // Fast < 100ms (Green)
        if (duration > 500) {
            durationColor = "\x1b[31m"; // Slow > 500ms (Red)
        }
        else if (duration > 150) {
            durationColor = "\x1b[33m"; // Moderate 150-500ms (Yellow)
        }
        const formattedDuration = `${durationColor}${duration}ms${logger_1.styles.reset}`;
        // Resolve client IP cleanly
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const cleanIp = ip.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;
        const logMsg = `${formattedMethod} ${logger_1.styles.bold}${logger_1.styles.white}${url}${logger_1.styles.reset} - ${formattedStatus} ${logger_1.styles.gray}(${formattedDuration}) ${logger_1.styles.dim}[IP: ${cleanIp}]${logger_1.styles.reset}`;
        logger_1.Logger.http(logMsg);
    });
    next();
};
exports.httpLoggerMiddleware = httpLoggerMiddleware;
exports.default = exports.httpLoggerMiddleware;
