import { Request, Response, NextFunction } from "express";
import { Logger, styles } from "../../../../utils/logger";

// Paths to ignore from logging
const IGNORED_PATHS = ["/health", "/favicon.ico"];

const methodColors: Record<string, string> = {
	GET: "\x1b[36m",    // Cyan
	POST: "\x1b[32m",   // Green
	PUT: "\x1b[33m",    // Yellow
	PATCH: "\x1b[38;5;208m", // Orange
	DELETE: "\x1b[31m", // Red
};

export const httpLoggerMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
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
		const formattedMethod = `${methodColor}${styles.bold}${method}${styles.reset}`;

		// Colorize status code
		let statusColor = "\x1b[32m"; // Success default (Green)
		if (statusCode >= 500) {
			statusColor = "\x1b[1;31m"; // Server Error (Red bold)
		} else if (statusCode >= 400) {
			statusColor = "\x1b[1;33m"; // Client Error (Yellow/Orange bold)
		} else if (statusCode >= 300) {
			statusColor = "\x1b[36m"; // Redirect (Cyan)
		}
		const formattedStatus = `${statusColor}${statusCode}${styles.reset}`;

		// Colorize duration
		let durationColor = "\x1b[32m"; // Fast < 100ms (Green)
		if (duration > 500) {
			durationColor = "\x1b[31m"; // Slow > 500ms (Red)
		} else if (duration > 150) {
			durationColor = "\x1b[33m"; // Moderate 150-500ms (Yellow)
		}
		const formattedDuration = `${durationColor}${duration}ms${styles.reset}`;

		// Resolve client IP cleanly
		const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
		const cleanIp = ip.includes("::ffff:") ? ip.split("::ffff:")[1] : ip;

		const logMsg = `${formattedMethod} ${styles.bold}${styles.white}${url}${styles.reset} - ${formattedStatus} ${styles.gray}(${formattedDuration}) ${styles.dim}[IP: ${cleanIp}]${styles.reset}`;
		
		Logger.http(logMsg);
	});

	next();
};

export default httpLoggerMiddleware;
