import { Request, Response, NextFunction } from "express";

const getClientIp = (req: Request): string => {
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

	return (
		req.socket.remoteAddress ||
		req.connection?.remoteAddress ||
		"unknown"
	);
};

/**
 * IP Tracker Middleware
 * Attaches client IP address to the request object
 */
export const ipTrackerMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	req.clientIp = getClientIp(req);
	next();
};

export default ipTrackerMiddleware;
